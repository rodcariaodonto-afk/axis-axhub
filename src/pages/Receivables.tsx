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
import { Plus, CheckCircle, Pencil, Trash2 } from "lucide-react";
import PasswordConfirmDialog from "@/components/finance/PasswordConfirmDialog";
import PaymentConfirmDialog from "@/components/finance/PaymentConfirmDialog";

const statusLabels: Record<string, string> = { pending: "Pendente", paid: "Pago", overdue: "Vencido", canceled: "Cancelado" };
const statusFilter = ["all", "pending", "paid", "overdue", "canceled"];

export default function Receivables() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [customers, setCustomers] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ description: "", amount: "", due_date: "", customer_id: "", installments: "1", category_id: "" });
  const [categories, setCategories] = useState<any[]>([]);
  const [passwordDialog, setPasswordDialog] = useState<{ open: boolean; title: string; description: string; variant: "default" | "destructive"; onConfirm: () => Promise<void> }>({ open: false, title: "", description: "", variant: "default", onConfirm: async () => {} });
  const [paymentDialog, setPaymentDialog] = useState<{ open: boolean; itemId: string; amount: number; description: string }>({ open: false, itemId: "", amount: 0, description: "" });
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    const { data } = await supabase.from("receivables").select("*, customers(name), deals(name), orders(number), finance_categories(name, color)").order("due_date", { ascending: true });
    setItems(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const loadCustomers = async () => {
    const { data } = await supabase.from("customers").select("id, name").order("name");
    setCustomers(data || []);
  };

  const loadCategories = async () => {
    const { data } = await supabase.from("finance_categories").select("id, name, color").eq("type", "receita").order("name");
    setCategories(data || []);
  };

  const openCreate = async () => {
    await Promise.all([loadCustomers(), loadCategories()]);
    setEditItem(null);
    setForm({ description: "", amount: "", due_date: "", customer_id: "", installments: "1", category_id: "" });
    setDialogOpen(true);
  };

  const openEdit = async (item: any) => {
    await Promise.all([loadCustomers(), loadCategories()]);
    setEditItem(item);
    setForm({ description: item.description, amount: String(item.amount), due_date: item.due_date, customer_id: item.customer_id || "", installments: "1", category_id: item.category_id || "" });
    setPasswordDialog({
      open: true, title: "Editar Recebível", description: "Confirme sua senha para editar este lançamento.", variant: "default",
      onConfirm: async () => { setDialogOpen(true); },
    });
  };

  const openDelete = (item: any) => {
    setPasswordDialog({
      open: true, title: "Excluir Recebível", description: `Confirme sua senha para excluir "${item.description}". Esta ação não pode ser desfeita.`, variant: "destructive",
      onConfirm: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
        if (!profile || !user) return;
        await supabase.from("audit_logs").insert({ tenant_id: profile.tenant_id, entity: "receivable", action: "delete", entity_id: item.id, actor_user_id: user.id, before_json: item, after_json: null });
        const { error } = await supabase.from("receivables").delete().eq("id", item.id);
        if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
        else { toast({ title: "Recebível excluído!" }); fetchData(); }
      },
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
    if (!profile || !user) return;

    if (editItem) {
      const updatedFields = { description: form.description, amount: parseFloat(form.amount), due_date: form.due_date, customer_id: form.customer_id || null, category_id: form.category_id || null };
      await supabase.from("audit_logs").insert({ tenant_id: profile.tenant_id, entity: "receivable", action: "update", entity_id: editItem.id, actor_user_id: user.id, before_json: editItem, after_json: { ...editItem, ...updatedFields } });
      const { error } = await supabase.from("receivables").update(updatedFields).eq("id", editItem.id);
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else { toast({ title: "Recebível atualizado!" }); setDialogOpen(false); setEditItem(null); fetchData(); }
    } else {
      const numInstallments = Math.max(1, parseInt(form.installments) || 1);
      const amount = parseFloat(form.amount);
      const baseDate = new Date(form.due_date + "T12:00:00");
      const records = [];
      for (let i = 0; i < numInstallments; i++) {
        const dueDate = new Date(baseDate);
        dueDate.setMonth(dueDate.getMonth() + i);
        const description = numInstallments > 1 ? `${form.description} (${i + 1}/${numInstallments})` : form.description;
        records.push({ tenant_id: profile.tenant_id, description, amount, due_date: dueDate.toISOString().split("T")[0], customer_id: form.customer_id || null, category_id: form.category_id || null });
      }
      const { error } = await supabase.from("receivables").insert(records);
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else { toast({ title: numInstallments > 1 ? `${numInstallments} parcelas criadas!` : "Conta a receber criada!" }); setDialogOpen(false); fetchData(); }
    }
  };

  const openMarkPaid = (item: any) => {
    setPaymentDialog({ open: true, itemId: item.id, amount: Number(item.amount), description: item.description });
  };

  const handlePaymentConfirm = async (bankAccountId: string, paymentDate: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
    if (!profile) return;

    const { error: updateError } = await supabase.from("receivables").update({
      status: "paid", paid_at: paymentDate, bank_account_id: bankAccountId,
    }).eq("id", paymentDialog.itemId);
    if (updateError) { toast({ title: "Erro", description: updateError.message, variant: "destructive" }); return; }

    await supabase.from("bank_transactions").insert({
      tenant_id: profile.tenant_id, account_id: bankAccountId, type: "credit",
      description: `Recebimento: ${paymentDialog.description}`, amount: paymentDialog.amount,
      transaction_date: paymentDate, receivable_id: paymentDialog.itemId,
    });

    const { data: account } = await supabase.from("bank_accounts").select("balance").eq("id", bankAccountId).single();
    if (account) {
      await supabase.from("bank_accounts").update({ balance: Number(account.balance) + paymentDialog.amount }).eq("id", bankAccountId);
    }

    toast({ title: "Marcado como pago!", description: "Transação bancária registrada." });
    setPaymentDialog({ open: false, itemId: "", amount: 0, description: "" });
    fetchData();
  };

  const filtered = filter === "all" ? items : items.filter((i) => i.status === filter);
  const isOverdue = (item: any) => item.status === "pending" && new Date(item.due_date) < new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contas a Receber</h1>
          <p className="text-muted-foreground">Acompanhe seus recebíveis</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Nova Conta</Button>
      </div>

      <PasswordConfirmDialog open={passwordDialog.open} onOpenChange={(v) => setPasswordDialog((p) => ({ ...p, open: v }))} title={passwordDialog.title} description={passwordDialog.description} onConfirm={passwordDialog.onConfirm} variant={passwordDialog.variant} />

      <PaymentConfirmDialog open={paymentDialog.open} onOpenChange={(v) => setPaymentDialog((p) => ({ ...p, open: v }))} onConfirm={handlePaymentConfirm} title="Confirmar Recebimento" description={`Selecione a conta bancária para registrar o recebimento de R$ ${paymentDialog.amount.toFixed(2)}.`} />

      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditItem(null); }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>{editItem ? "Editar Recebível" : "Nova Conta a Receber"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2"><Label>Descrição</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required /></div>
            <div className={`grid gap-4 ${!editItem ? "grid-cols-3" : "grid-cols-2"}`}>
              <div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Vencimento</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} required /></div>
              {!editItem && <div className="space-y-2"><Label>Parcelas</Label><Input type="number" min="1" max="120" value={form.installments} onChange={(e) => setForm({ ...form, installments: e.target.value })} required /></div>}
            </div>
            <div className="space-y-2">
              <Label>Cliente (opcional)</Label>
              <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Categoria (opcional)</Label>
              <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <span className="inline-block h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: c.color || '#6B7280' }} />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full">{editItem ? "Salvar" : "Criar"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="flex gap-2">
        {statusFilter.map((s) => (
          <Button key={s} variant={filter === s ? "default" : "outline"} size="sm" onClick={() => setFilter(s)}>
            {s === "all" ? "Todos" : statusLabels[s]}
          </Button>
        ))}
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>Descrição</TableHead><TableHead>Cliente</TableHead><TableHead>Deal</TableHead><TableHead>Pedido</TableHead><TableHead>Categoria</TableHead><TableHead>Vencimento</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow> :
              filtered.length === 0 ? <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum recebível encontrado</TableCell></TableRow> :
              filtered.map((r) => (
                <TableRow key={r.id} className={`border-border ${isOverdue(r) ? "bg-destructive/5" : ""}`}>
                  <TableCell className="font-medium">{r.description}</TableCell>
                  <TableCell className="text-muted-foreground">{r.customers?.name || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{(r as any).deals?.name || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground font-mono">{(r as any).orders?.number || "—"}</TableCell>
                  <TableCell>
                    {(r as any).finance_categories ? (
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span className="inline-block h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: (r as any).finance_categories.color || '#6B7280' }} />
                        {(r as any).finance_categories.name}
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className={isOverdue(r) ? "text-destructive font-medium" : ""}>{new Date(r.due_date).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell><Badge variant={r.status === "paid" ? "default" : isOverdue(r) ? "destructive" : "secondary"}>{isOverdue(r) ? "Vencido" : statusLabels[r.status] || r.status}</Badge></TableCell>
                  <TableCell className="text-right font-medium">R$ {Number(r.amount).toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      {r.status === "pending" && (
                        <Button variant="ghost" size="icon" onClick={() => openMarkPaid(r)} title="Marcar como pago" className="h-8 w-8">
                          <CheckCircle className="h-4 w-4 text-success" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => openEdit(r)} title="Editar" className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => openDelete(r)} title="Excluir" className="h-8 w-8"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
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
