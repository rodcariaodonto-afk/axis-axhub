import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Trash2, MoreHorizontal, CalendarIcon, FileText, Download, Receipt } from "lucide-react";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  draft: "secondary", pending_approval: "outline", approved: "default",
  shipped: "default", completed: "default", canceled: "destructive",
};
const statusLabels: Record<string, string> = {
  draft: "Rascunho", pending_approval: "Aguardando", approved: "Aprovado",
  shipped: "Enviado", completed: "Concluído", canceled: "Cancelado",
};

const transitions: Record<string, { label: string; to: string }[]> = {
  draft: [{ label: "Enviar p/ Aprovação", to: "pending_approval" }, { label: "Cancelar", to: "canceled" }],
  pending_approval: [{ label: "Aprovar", to: "approved" }, { label: "Cancelar", to: "canceled" }],
  approved: [{ label: "Marcar Enviado", to: "shipped" }, { label: "Cancelar", to: "canceled" }],
  shipped: [{ label: "Concluir", to: "completed" }],
};

const pmLabels: Record<string, string> = { pix: "PIX", credit_card: "Cartão Créd.", debit_card: "Cartão Déb.", boleto: "Boleto", transfer: "Transferência", cash: "Dinheiro" };

const parseBRCurrency = (v: string): number => {
  if (!v) return 0;
  let s = v.replace(/\s/g, "");
  if (s.includes(",") && s.includes(".")) {
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    if (lastComma > lastDot) { s = s.replace(/\./g, "").replace(",", "."); }
    else { s = s.replace(/,/g, ""); }
  } else if (s.includes(",")) { s = s.replace(",", "."); }
  return parseFloat(s) || 0;
};

interface OrderItem { product_id: string; product_name: string; quantity: number; unit_price: number; total: number; }
interface PaymentEntry { method: string; amount: string; installments: number; first_due_date: Date | undefined; }
interface RecurringEntry { enabled: boolean; amount: string; method: string; months: string; start_date: Date | undefined; }

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [items, setItems] = useState<OrderItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [itemQty, setItemQty] = useState("1");
  const [notes, setNotes] = useState("");
  const [setupEnabled, setSetupEnabled] = useState(true);
  const [payments, setPayments] = useState<PaymentEntry[]>([{ method: "pix", amount: "", installments: 1, first_due_date: undefined }]);
  const [recurring, setRecurring] = useState<RecurringEntry>({ enabled: false, amount: "", method: "pix", months: "12", start_date: undefined });
  const [invoiceMap, setInvoiceMap] = useState<Record<string, any>>({});
  const [emittingId, setEmittingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchOrders = useCallback(async () => {
    const { data } = await supabase.from("orders").select("*, customers(name), deals(name)").order("created_at", { ascending: false });
    setOrders(data || []);
    // Buscar notas fiscais mais recentes por pedido
    if (data && data.length > 0) {
      const orderIds = data.map((o: any) => o.id);
      const { data: invoices } = await supabase
        .from("fiscal_invoices")
        .select("*")
        .in("order_id", orderIds)
        .order("created_at", { ascending: false });
      const map: Record<string, any> = {};
      (invoices || []).forEach((inv: any) => {
        if (inv.order_id && !map[inv.order_id]) map[inv.order_id] = inv;
      });
      setInvoiceMap(map);
    } else {
      setInvoiceMap({});
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const loadFormData = async () => {
    const [{ data: c }, { data: p }] = await Promise.all([
      supabase.from("customers").select("id, name").order("name"),
      supabase.from("products").select("id, name, price, sku").eq("is_active", true).order("name"),
    ]);
    setCustomers(c || []); setProducts(p || []);
  };

  const handleOpenDialog = () => {
    loadFormData();
    setSelectedCustomer(""); setItems([]); setNotes("");
    setSetupEnabled(true);
    setPayments([{ method: "pix", amount: "", installments: 1, first_due_date: undefined }]);
    setRecurring({ enabled: false, amount: "", method: "pix", months: "12", start_date: undefined });
    setDialogOpen(true);
  };

  const addItem = () => {
    const product = products.find((p) => p.id === selectedProduct);
    if (!product) return;
    const qty = parseInt(itemQty) || 1;
    setItems([...items, { product_id: product.id, product_name: `${product.name} (${product.sku})`, quantity: qty, unit_price: Number(product.price), total: qty * Number(product.price) }]);
    setSelectedProduct(""); setItemQty("1");
  };

  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));
  const subtotal = items.reduce((sum, i) => sum + i.total, 0);

  // Payment helpers
  const totalAllocated = payments.reduce((sum, p) => sum + parseBRCurrency(p.amount), 0);
  const remaining = subtotal - totalAllocated;
  const isFullyAllocated = Math.abs(remaining) < 0.01 && subtotal > 0;

  const addPayment = () => {
    const rem = Math.max(0, subtotal - totalAllocated);
    setPayments([...payments, { method: "pix", amount: rem > 0 ? rem.toFixed(2).replace(".", ",") : "", installments: 1, first_due_date: undefined }]);
  };
  const removePayment = (i: number) => setPayments(payments.filter((_, idx) => idx !== i));
  const updatePayment = (i: number, field: keyof PaymentEntry, value: any) => {
    const updated = [...payments];
    (updated[i] as any)[field] = value;
    
    setPayments(updated);
  };

  const paymentSummary = (paymentList: PaymentEntry[]) =>
    paymentList.map(p => `${pmLabels[p.method] || p.method}${p.installments > 1 ? ` ${p.installments}x` : ""}`).join(" + ");

  const handleCreate = async () => {
    if (!selectedCustomer || items.length === 0 || !isFullyAllocated) { toast({ title: "Erro", description: "Preencha todos os campos e aloque o valor total.", variant: "destructive" }); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
    if (!profile) return;
    const orderNumber = `PED-${Date.now().toString(36).toUpperCase()}`;
    const summary = paymentSummary(payments);
    const { data: order, error } = await supabase.from("orders").insert({ tenant_id: profile.tenant_id, number: orderNumber, customer_id: selectedCustomer, subtotal, total: subtotal, notes: notes || null, payment_method: summary, installments: payments[0]?.installments || 1 } as any).select().single();
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    const orderItems = items.map((i) => ({ tenant_id: profile.tenant_id, order_id: order.id, product_id: i.product_id, quantity: i.quantity, unit_price: i.unit_price, total: i.total }));
    await supabase.from("order_items").insert(orderItems);
    // Insert split payments with installment date generation
    const orderPayments: any[] = [];
    for (const p of payments) {
      const pAmount = parseBRCurrency(p.amount);
      if (p.installments > 1 && p.first_due_date) {
        const perInstallment = Number((pAmount / p.installments).toFixed(2));
        for (let n = 0; n < p.installments; n++) {
          const dueDate = addMonths(p.first_due_date, n);
          orderPayments.push({ tenant_id: profile.tenant_id, order_id: order.id, method: p.method, amount: perInstallment, installments: 1, due_date: format(dueDate, "yyyy-MM-dd") });
        }
      } else {
        orderPayments.push({ tenant_id: profile.tenant_id, order_id: order.id, method: p.method, amount: pAmount, installments: p.installments, due_date: p.first_due_date ? format(p.first_due_date, "yyyy-MM-dd") : null });
      }
    }
    await supabase.from("order_payments").insert(orderPayments as any);

    // Generate receivables for each payment/installment
    const receivables: any[] = [];
    let installmentCounter: Record<string, { current: number; total: number }> = {};
    for (const p of payments) {
      const key = p.method;
      if (!installmentCounter[key]) installmentCounter[key] = { current: 0, total: p.installments };
    }
    for (const op of orderPayments) {
      const methodLabel = pmLabels[op.method] || op.method;
      const counterKey = op.method;
      installmentCounter[counterKey].current++;
      const cur = installmentCounter[counterKey].current;
      const tot = installmentCounter[counterKey].total;
      const desc = tot > 1
        ? `Pedido ${orderNumber} — ${methodLabel} ${cur}/${tot}`
        : `Pedido ${orderNumber} — ${methodLabel}`;
      receivables.push({
        tenant_id: profile.tenant_id,
        description: desc,
        amount: op.amount,
        due_date: op.due_date || new Date().toISOString().split("T")[0],
        order_id: order.id,
        customer_id: selectedCustomer,
      });
    }
    if (receivables.length > 0) {
      await supabase.from("receivables").insert(receivables as any);
    }

    toast({ title: "Pedido criado!", description: `Número: ${orderNumber} — ${receivables.length} recebível(is) gerado(s)` });
    setDialogOpen(false); fetchOrders();
  };

  const deleteOrder = async (orderId: string) => {
    if (!confirm("Tem certeza que deseja excluir este pedido? Esta ação não pode ser desfeita.")) return;
    // Cascade delete: receivables → order_payments → order_items → order
    await supabase.from("receivables").delete().eq("order_id", orderId);
    await supabase.from("order_payments").delete().eq("order_id", orderId);
    await supabase.from("order_items").delete().eq("order_id", orderId);
    const { error } = await supabase.from("orders").delete().eq("id", orderId);
    if (error) { toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Pedido excluído com sucesso!" });
    fetchOrders();
  };

  const changeStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    if (newStatus === "completed") {
      // Check if receivables already exist (created during order creation)
      const { data: existingReceivables } = await supabase.from("receivables").select("id").eq("order_id", orderId);
      if (!existingReceivables || existingReceivables.length === 0) {
        // Legacy fallback for old orders without split payments
        try {
          const { data: order } = await supabase.from("orders").select("*").eq("id", orderId).single();
          const { data: { user: u } } = await supabase.auth.getUser();
          const { data: profile } = u ? await supabase.from("profiles").select("tenant_id").eq("id", u.id).single() : { data: null };
          if (order && profile) {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 30);
            await supabase.from("receivables").insert({
              tenant_id: profile.tenant_id, description: `Pedido ${order.number}`, amount: Number(order.total),
              due_date: dueDate.toISOString().split("T")[0], order_id: orderId, customer_id: order.customer_id, deal_id: order.deal_id,
            } as any);
          }
        } catch { /* ignore */ }
      }
      toast({ title: `Pedido concluído!`, description: "Recebíveis já gerados na criação do pedido." });
    } else {
      toast({ title: `Status alterado para ${statusLabels[newStatus]}` });
    }
    fetchOrders();
  };

  const emitInvoice = async (orderId: string, type: "nfe" | "nfse") => {
    setEmittingId(orderId);
    try {
      // Validar fiscal_settings
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) throw new Error("Não autenticado");
      const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", u.id).single();
      if (!profile) throw new Error("Perfil não encontrado");
      const { data: settings } = await supabase
        .from("fiscal_settings")
        .select("*")
        .eq("tenant_id", profile.tenant_id)
        .maybeSingle();
      if (!settings) {
        toast({ title: "Configure os dados fiscais antes de emitir", description: "Acesse Configurações → Fiscal", variant: "destructive" });
        return;
      }
      if (type === "nfe" && !settings.habilita_nfe) {
        toast({ title: "NF-e não habilitada", description: "Habilite em Configurações → Fiscal → Dados da Empresa", variant: "destructive" });
        return;
      }
      if (type === "nfse" && !settings.habilita_nfse) {
        toast({ title: "NFS-e não habilitada", description: "Habilite em Configurações → Fiscal → Dados da Empresa", variant: "destructive" });
        return;
      }
      // Para NF-e, validar NCM/CFOP nos itens
      if (type === "nfe") {
        const { data: orderItems } = await supabase
          .from("order_items")
          .select("product_id, products(ncm, cfop, name)")
          .eq("order_id", orderId);
        const missing = (orderItems || []).filter((it: any) => !it.products?.ncm || !it.products?.cfop);
        if (missing.length > 0) {
          toast({
            title: "Produtos sem NCM/CFOP",
            description: `Cadastre NCM e CFOP nos produtos antes de emitir NF-e (${missing.length} item(ns) pendente(s)).`,
            variant: "destructive",
          });
          return;
        }
      }
      const { data, error } = await supabase.functions.invoke("process-fiscal-invoice", {
        body: { order_id: orderId, type },
      });
      if (error) throw error;
      toast({ title: "Nota enviada para processamento", description: data?.message || `Status: ${data?.status || "processando"}` });
      fetchOrders();
    } catch (err: any) {
      toast({ title: "Erro ao emitir nota", description: err.message || "Falha desconhecida", variant: "destructive" });
    } finally {
      setEmittingId(null);
    }
  };

  const downloadDocument = (invoice: any, kind: "danfe" | "xml") => {
    const path = kind === "danfe" ? invoice.caminho_danfe : invoice.caminho_xml;
    if (!path) {
      toast({ title: "Documento ainda não disponível", variant: "destructive" });
      return;
    }
    const base = invoice.focus_environment === "producao"
      ? "https://api.focusnfe.com.br"
      : "https://homologacao.focusnfe.com.br";
    const url = path.startsWith("http") ? path : `${base}${path.startsWith("/") ? "" : "/"}${path}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const renderInvoiceBadge = (orderId: string) => {
    const inv = invoiceMap[orderId];
    if (!inv) return <Badge variant="secondary" className="text-muted-foreground">—</Badge>;
    const status = (inv.status || "").toLowerCase();
    if (status === "autorizada") return <Badge className="bg-green-600 hover:bg-green-700">Autorizada</Badge>;
    if (status === "cancelada") return <Badge variant="secondary">Cancelada</Badge>;
    if (["erro", "rejeitada"].includes(status)) return <Badge variant="destructive">Erro</Badge>;
    return <Badge className="bg-amber-500 hover:bg-amber-600">Processando</Badge>;
  };

  const filtered = orders.filter((o) => o.number.toLowerCase().includes(search.toLowerCase()) || (o.customers?.name || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Pedidos</h1><p className="text-muted-foreground">Gerencie seus pedidos de venda</p></div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button onClick={handleOpenDialog}><Plus className="mr-2 h-4 w-4" />Novo Pedido</Button></DialogTrigger>
          <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Novo Pedido</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}><SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger><SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-2">
                <Label>Adicionar Item</Label>
                <div className="flex gap-2">
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}><SelectTrigger className="flex-1"><SelectValue placeholder="Produto" /></SelectTrigger><SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} — R$ {Number(p.price).toFixed(2)}</SelectItem>)}</SelectContent></Select>
                  <Input type="number" min="1" value={itemQty} onChange={(e) => setItemQty(e.target.value)} className="w-20" placeholder="Qtd" />
                  <Button type="button" variant="secondary" onClick={addItem} disabled={!selectedProduct}><Plus className="h-4 w-4" /></Button>
                </div>
              </div>
              {items.length > 0 && (
                <div className="border border-border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader><TableRow className="border-border"><TableHead>Produto</TableHead><TableHead className="text-right">Qtd</TableHead><TableHead className="text-right">Preço Un.</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="w-10" /></TableRow></TableHeader>
                    <TableBody>{items.map((item, i) => (
                      <TableRow key={i} className="border-border">
                        <TableCell className="text-sm">{item.product_name}</TableCell><TableCell className="text-right">{item.quantity}</TableCell><TableCell className="text-right">R$ {item.unit_price.toFixed(2)}</TableCell><TableCell className="text-right font-medium">R$ {item.total.toFixed(2)}</TableCell>
                        <TableCell><Button variant="ghost" size="icon" onClick={() => removeItem(i)} className="h-7 w-7"><Trash2 className="h-3 w-3 text-destructive" /></Button></TableCell>
                      </TableRow>
                    ))}</TableBody>
                  </Table>
                  <div className="p-3 border-t border-border flex justify-between items-center"><span className="text-sm text-muted-foreground">{items.length} item(ns)</span><span className="text-lg font-bold">Total: R$ {subtotal.toFixed(2)}</span></div>
                </div>
              )}

              {/* Split Payment Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Formas de Pagamento</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addPayment} disabled={subtotal === 0}>
                    <Plus className="h-3 w-3 mr-1" />Adicionar Forma
                  </Button>
                </div>
                {payments.map((pm, i) => (
                  <div key={i} className="flex gap-2 items-end border border-border rounded-md p-3">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs text-muted-foreground">Método</Label>
                      <Select value={pm.method} onValueChange={(v) => updatePayment(i, "method", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pix">PIX</SelectItem>
                          <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                          <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                          <SelectItem value="boleto">Boleto</SelectItem>
                          <SelectItem value="transfer">Transferência</SelectItem>
                          <SelectItem value="cash">Dinheiro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-32 space-y-1">
                      <Label className="text-xs text-muted-foreground">Valor (R$)</Label>
                      <Input type="text" inputMode="decimal" value={pm.amount} onChange={(e) => { const v = e.target.value.replace(/[^0-9.,]/g, ""); updatePayment(i, "amount", v); }} placeholder="10.000,00" />
                    </div>
                    <div className="w-24 space-y-1">
                      <Label className="text-xs text-muted-foreground">Parcelas</Label>
                      <Select value={String(pm.installments)} onValueChange={(v) => updatePayment(i, "installments", parseInt(v))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, n) => n + 1).map((n) => (
                            <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-36 space-y-1">
                      <Label className="text-xs text-muted-foreground">{pm.installments > 1 ? "Data 1ª parcela" : "Data pgto"}</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-10", !pm.first_due_date && "text-muted-foreground")}>
                            <CalendarIcon className="mr-1 h-3 w-3" />
                            {pm.first_due_date ? format(pm.first_due_date, "dd/MM/yyyy") : <span className="text-xs">Selecionar</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={pm.first_due_date} onSelect={(d) => updatePayment(i, "first_due_date", d)} initialFocus className={cn("p-3 pointer-events-auto")} locale={ptBR} />
                        </PopoverContent>
                      </Popover>
                    </div>
                    {payments.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => removePayment(i)} className="h-9 w-9 shrink-0"><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    )}
                  </div>
                ))}
                {subtotal > 0 && (
                  <div className={`text-sm text-right font-medium ${isFullyAllocated ? "text-green-600" : "text-destructive"}`}>
                    {isFullyAllocated ? `✓ Alocado: R$ ${totalAllocated.toFixed(2)}` : `Falta alocar: R$ ${remaining.toFixed(2)}`}
                  </div>
                )}
              </div>

              <div className="space-y-2"><Label>Observações</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas do pedido (opcional)" /></div>
              <Button onClick={handleCreate} className="w-full" disabled={!selectedCustomer || items.length === 0 || !isFullyAllocated}>
                Criar Pedido
                {items.length === 0 && <span className="ml-2 text-xs opacity-70">(adicione itens com o botão +)</span>}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar por número ou cliente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="border-border"><TableHead>Nº Pedido</TableHead><TableHead>Cliente</TableHead><TableHead>Deal</TableHead><TableHead>Status</TableHead><TableHead>Forma Pgto</TableHead><TableHead>Pagamento</TableHead><TableHead>Nota Fiscal</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="w-10" /></TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow> :
              filtered.length === 0 ? <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum pedido encontrado</TableCell></TableRow> :
              filtered.map((o) => {
                const pm = (o as any).payment_method || "pix";
                const inv = invoiceMap[o.id];
                const canDownload = inv?.status === "autorizada";
                return (
                <TableRow key={o.id} className="border-border">
                  <TableCell className="font-mono text-xs">{o.number}</TableCell>
                  <TableCell className="font-medium">{o.customers?.name || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{(o as any).deals?.name || "—"}</TableCell>
                  <TableCell><Badge variant={statusColors[o.status] as any || "secondary"}>{statusLabels[o.status] || o.status}</Badge></TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">{pm}</TableCell>
                  <TableCell><Badge variant={o.paid_status === "paid" ? "default" : "secondary"}>{o.paid_status === "paid" ? "Pago" : o.paid_status === "partial" ? "Parcial" : "Pendente"}</Badge></TableCell>
                  <TableCell>{renderInvoiceBadge(o.id)}</TableCell>
                  <TableCell className="text-right font-medium">R$ {Number(o.total).toFixed(2)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {transitions[o.status]?.map((t) => (
                          <DropdownMenuItem key={t.to} onClick={() => changeStatus(o.id, t.to)}>{t.label}</DropdownMenuItem>
                        ))}
                        <DropdownMenuItem onClick={() => emitInvoice(o.id, "nfe")} disabled={emittingId === o.id}>
                          <Receipt className="mr-2 h-4 w-4" />Emitir NF-e
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => emitInvoice(o.id, "nfse")} disabled={emittingId === o.id}>
                          <Receipt className="mr-2 h-4 w-4" />Emitir NFS-e
                        </DropdownMenuItem>
                        {canDownload && inv?.caminho_danfe && (
                          <DropdownMenuItem onClick={() => downloadDocument(inv, "danfe")}>
                            <Download className="mr-2 h-4 w-4" />Baixar DANFE
                          </DropdownMenuItem>
                        )}
                        {canDownload && inv?.caminho_xml && (
                          <DropdownMenuItem onClick={() => downloadDocument(inv, "xml")}>
                            <FileText className="mr-2 h-4 w-4" />Baixar XML
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => deleteOrder(o.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />Excluir Pedido
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );})}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
