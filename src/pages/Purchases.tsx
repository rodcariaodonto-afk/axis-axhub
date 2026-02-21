import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, PackageCheck } from "lucide-react";

const statusLabels: Record<string, string> = { draft: "Rascunho", sent: "Enviada", received: "Recebida", completed: "Concluída" };

interface POItem { product_id: string; product_name: string; quantity: number; unit_price: number; total: number; }

export default function Purchases() {
  const [pos, setPos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [items, setItems] = useState<POItem[]>([]);
  const [selProduct, setSelProduct] = useState("");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    const { data } = await supabase.from("purchase_orders").select("*, suppliers(name)").order("created_at", { ascending: false });
    setPos(data || []); setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openDialog = async () => {
    const [{ data: s }, { data: p }] = await Promise.all([
      supabase.from("suppliers").select("id, name").order("name"),
      supabase.from("products").select("id, name, cost, sku").order("name"),
    ]);
    setSuppliers(s || []); setProducts(p || []);
    setSelectedSupplier(""); setExpectedDate(""); setItems([]);
    setDialogOpen(true);
  };

  const addItem = () => {
    const product = products.find((p) => p.id === selProduct);
    if (!product) return;
    const q = parseInt(qty) || 1;
    const up = parseFloat(price) || Number(product.cost) || 0;
    setItems([...items, { product_id: product.id, product_name: `${product.name} (${product.sku})`, quantity: q, unit_price: up, total: q * up }]);
    setSelProduct(""); setQty("1"); setPrice("");
  };

  const totalAmount = items.reduce((sum, i) => sum + i.total, 0);

  const handleCreate = async () => {
    if (!selectedSupplier || items.length === 0) { toast({ title: "Erro", description: "Selecione fornecedor e itens.", variant: "destructive" }); return; }
    const { data: profile } = await supabase.from("profiles").select("tenant_id").single();
    if (!profile) return;
    const number = `OC-${Date.now().toString(36).toUpperCase()}`;
    const { data: po, error } = await supabase.from("purchase_orders").insert({
      tenant_id: profile.tenant_id, number, supplier_id: selectedSupplier, total_amount: totalAmount,
      expected_delivery_date: expectedDate || null,
    }).select().single();
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    await supabase.from("po_items").insert(items.map((i) => ({
      tenant_id: profile.tenant_id, po_id: po.id, product_id: i.product_id, quantity: i.quantity, unit_price: i.unit_price, total: i.total,
    })));
    toast({ title: "Ordem de compra criada!", description: `Número: ${number}` });
    setDialogOpen(false); fetchData();
  };

  const receiveOrder = async (poId: string) => {
    const { data: poItems } = await supabase.from("po_items").select("*").eq("po_id", poId);
    if (!poItems) return;
    const { data: profile } = await supabase.from("profiles").select("tenant_id").single();
    if (!profile) return;
    const { data: warehouse } = await supabase.from("warehouses").select("id").eq("tenant_id", profile.tenant_id).eq("is_default", true).single();
    if (!warehouse) { toast({ title: "Erro", description: "Nenhum depósito padrão encontrado.", variant: "destructive" }); return; }

    for (const item of poItems) {
      // Upsert stock
      const { data: existing } = await supabase.from("product_stock").select("id, quantity").eq("product_id", item.product_id).eq("warehouse_id", warehouse.id).single();
      if (existing) {
        await supabase.from("product_stock").update({ quantity: existing.quantity + item.quantity }).eq("id", existing.id);
      } else {
        await supabase.from("product_stock").insert({ tenant_id: profile.tenant_id, product_id: item.product_id, warehouse_id: warehouse.id, quantity: item.quantity });
      }
      // Record movement
      await supabase.from("stock_movements").insert({ tenant_id: profile.tenant_id, product_id: item.product_id, warehouse_id: warehouse.id, type: "in", quantity: item.quantity, reason: "purchase_received", reference_id: poId });
      // Update received qty
      await supabase.from("po_items").update({ received_quantity: item.quantity }).eq("id", item.id);
    }
    await supabase.from("purchase_orders").update({ status: "received" }).eq("id", poId);
    
    // Auto-create payable when PO is received
    try {
      const { data: po } = await supabase.from("purchase_orders").select("*").eq("id", poId).single();
      if (po) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);
        await supabase.from("payables").insert({
          tenant_id: profile.tenant_id,
          description: `OC ${po.number}`,
          amount: Number(po.total_amount),
          due_date: dueDate.toISOString().split("T")[0],
          supplier_id: po.supplier_id,
          po_id: poId,
        });
        toast({ title: "Mercadoria recebida!", description: "Estoque atualizado e conta a pagar gerada (venc. 30 dias)." });
      }
    } catch {
      toast({ title: "Mercadoria recebida e estoque atualizado!" });
    }
    fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Ordens de Compra</h1><p className="text-muted-foreground">Gerencie suas compras com fornecedores</p></div>
        <Button onClick={openDialog}><Plus className="mr-2 h-4 w-4" />Nova OC</Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova Ordem de Compra</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fornecedor</Label>
                <Select value={selectedSupplier} onValueChange={setSelectedSupplier}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-2"><Label>Entrega Prevista</Label><Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} /></div>
            </div>
            <div className="space-y-2">
              <Label>Adicionar Item</Label>
              <div className="flex gap-2">
                <Select value={selProduct} onValueChange={setSelProduct}><SelectTrigger className="flex-1"><SelectValue placeholder="Produto" /></SelectTrigger><SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>
                <Input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} className="w-20" placeholder="Qtd" />
                <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="w-28" placeholder="Preço un." />
                <Button variant="secondary" onClick={addItem} disabled={!selProduct}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
            {items.length > 0 && (
              <div className="border border-border rounded-md overflow-hidden">
                <Table>
                  <TableHeader><TableRow className="border-border"><TableHead>Produto</TableHead><TableHead className="text-right">Qtd</TableHead><TableHead className="text-right">Preço</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="w-10" /></TableRow></TableHeader>
                  <TableBody>{items.map((item, i) => (
                    <TableRow key={i} className="border-border"><TableCell className="text-sm">{item.product_name}</TableCell><TableCell className="text-right">{item.quantity}</TableCell><TableCell className="text-right">R$ {item.unit_price.toFixed(2)}</TableCell><TableCell className="text-right font-medium">R$ {item.total.toFixed(2)}</TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => setItems(items.filter((_, idx) => idx !== i))} className="h-7 w-7"><Trash2 className="h-3 w-3 text-destructive" /></Button></TableCell></TableRow>
                  ))}</TableBody>
                </Table>
                <div className="p-3 border-t border-border flex justify-between items-center"><span className="text-sm text-muted-foreground">{items.length} item(ns)</span><span className="text-lg font-bold">Total: R$ {totalAmount.toFixed(2)}</span></div>
              </div>
            )}
            <Button onClick={handleCreate} className="w-full" disabled={!selectedSupplier || items.length === 0}>Criar OC</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="border-border"><TableHead>Nº</TableHead><TableHead>Fornecedor</TableHead><TableHead>Status</TableHead><TableHead>Entrega Prevista</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="w-10" /></TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow> :
              pos.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma ordem de compra</TableCell></TableRow> :
              pos.map((p) => (
                <TableRow key={p.id} className="border-border">
                  <TableCell className="font-mono text-xs">{p.number}</TableCell>
                  <TableCell className="font-medium">{p.suppliers?.name || "—"}</TableCell>
                  <TableCell><Badge variant="secondary">{statusLabels[p.status] || p.status}</Badge></TableCell>
                  <TableCell>{p.expected_delivery_date ? new Date(p.expected_delivery_date).toLocaleDateString("pt-BR") : "—"}</TableCell>
                  <TableCell className="text-right font-medium">R$ {Number(p.total_amount).toFixed(2)}</TableCell>
                  <TableCell>
                    {(p.status === "draft" || p.status === "sent") && (
                      <Button variant="ghost" size="icon" onClick={() => receiveOrder(p.id)} title="Receber Mercadoria" className="h-8 w-8">
                        <PackageCheck className="h-4 w-4 text-success" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
