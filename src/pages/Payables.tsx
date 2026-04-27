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
import { Plus, CheckCircle, Pencil, Trash2, Repeat } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import PasswordConfirmDialog from "@/components/finance/PasswordConfirmDialog";
import PaymentConfirmDialog from "@/components/finance/PaymentConfirmDialog";
import { AccountingTypeSelect } from "@/components/financial/AccountingTypeSelect";
import { AccountingTypeBadge } from "@/components/financial/AccountingTypeBadge";

const statusLabels: Record<string, string> = { pending: "Pendente", paid: "Pago", overdue: "Vencido", canceled: "Cancelado" };
const statusFilter = ["all", "pending", "paid", "overdue", "canceled"];

export default function Payables() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({
    description: "", amount: "", due_date: "", supplier_id: "", category_id: "",
    accounting_type: "", accounting_group: "",
    is_recurring: false,
    frequency_type: "monthly" as "monthly" | "weekly" | "daily",
    frequency_interval: 1,
    end_date: "",
  });
  const [categories, setCategories] = useState<any[]>([]);
  const [passwordDialog, setPasswordDialog] = useState<{ open: boolean; title: string; description: string; variant: "default" | "destructive"; onConfirm: () => Promise<void> }>({ open: false, title: "", description: "", variant: "default", onConfirm: async () => {} });
  const [paymentDialog, setPaymentDialog] = useState<{ open: boolean; itemId: string; amount: number; description: string }>({ open: false, itemId: "", amount: 0, description: "" });
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    const { data } = await supabase.from("payables").select("*, suppliers(name), finance_categories(name, color)").order("due_date", { ascending: true });
    setItems(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const loadSuppliers = async () => {
    const { data } = await supabase.from("suppliers").select("id, name").order("name");
    setSuppliers(data || []);
  };

  const loadCategories = async () => {
    const { data } = await supabase.from("finance_categories").select("id, name, color").eq("type", "despesa").order("name");
    setCategories(data || []);
  };

  const openCreate = async () => {
    await Promise.all([loadSuppliers(), loadCategories()]);
    setEditItem(null);
    setForm({
      description: "", amount: "", due_date: "", supplier_id: "", category_id: "",
      accounting_type: "", accounting_group: "",
      is_recurring: false, frequency_type: "monthly", frequency_interval: 1, end_date: "",
    });
    setDialogOpen(true);
  };

  const openEdit = async (item: any) => {
    await Promise.all([loadSuppliers(), loadCategories()]);
    setEditItem(item);
    setForm({
      description: item.description, amount: String(item.amount), due_date: item.due_date,
      supplier_id: item.supplier_id || "", category_id: item.category_id || "",
      accounting_type: item.accounting_type || "", accounting_group: item.accounting_group || "",
      is_recurring: false, frequency_type: "monthly", frequency_interval: 1, end_date: "",
    });
    setPasswordDialog({
      open: true, title: "Editar Conta a Pagar", description: "Confirme sua senha para editar este lançamento.", variant: "default",
      onConfirm: async () => { setDialogOpen(true); },
    });
  };

  const openDelete = (item: any) => {
    setPasswordDialog({
      open: true, title: "Excluir Conta a Pagar", description: `Confirme sua senha para excluir "${item.description}". Esta ação não pode ser desfeita.`, variant: "destructive",
      onConfirm: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
        if (!profile || !user) return;
        await supabase.from("audit_logs").insert({ tenant_id: profile.tenant_id, entity: "payable", action: "delete", entity_id: item.id, actor_user_id: user.id, before_json: item, after_json: null });
        const { error } = await supabase.from("payables").delete().eq("id", item.id);
        if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
        else { toast({ title: "Conta excluída!" }); fetchData(); }
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
      const updatedFields = { description: form.description, amount: parseFloat(form.amount), due_date: form.due_date, supplier_id: form.supplier_id || null, category_id: form.category_id || null, accounting_type: form.accounting_type || null, accounting_group: form.accounting_group || null };
      await supabase.from("audit_logs").insert({ tenant_id: profile.tenant_id, entity: "payable", action: "update", entity_id: editItem.id, actor_user_id: user.id, before_json: editItem, after_json: { ...editItem, ...updatedFields } });
      const { error } = await supabase.from("payables").update(updatedFields).eq("id", editItem.id);
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else { toast({ title: "Conta atualizada!" }); setDialogOpen(false); setEditItem(null); fetchData(); }
    } else {
      if (form.is_recurring) {
        // Criar conta + recorrência via RPC atômica
        const { data, error } = await supabase.rpc("create_payable_with_recurrence", {
          p_tenant_id: profile.tenant_id,
          p_description: form.description,
          p_amount: parseFloat(form.amount),
          p_due_date: form.due_date,
          p_supplier_id: form.supplier_id || null,
          p_category_id: form.category_id || null,
          p_frequency_type: form.frequency_type,
          p_frequency_interval: form.frequency_interval,
          p_end_date: form.end_date || null,
          p_accounting_type: form.accounting_type || null,
          p_accounting_group: form.accounting_group || null,
        });
        if (error) {
          toast({ title: "Erro", description: error.message, variant: "destructive" });
        } else {
          await supabase.from("audit_logs").insert({
            tenant_id: profile.tenant_id, entity: "payment_recurrence", action: "create",
            entity_id: data, actor_user_id: user.id,
            after_json: { description: form.description, frequency_type: form.frequency_type, frequency_interval: form.frequency_interval },
          });
          toast({ title: "Conta recorrente criada!", description: "A próxima conta será gerada automaticamente." });
          setDialogOpen(false);
          fetchData();
        }
      } else {
        const { error } = await supabase.from("payables").insert({ tenant_id: profile.tenant_id, description: form.description, amount: parseFloat(form.amount), due_date: form.due_date, supplier_id: form.supplier_id || null, category_id: form.category_id || null, accounting_type: form.accounting_type || null, accounting_group: form.accounting_group || null });
        if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
        else { toast({ title: "Conta a pagar criada!" }); setDialogOpen(false); fetchData(); }
      }
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

    const { error: updateError } = await supabase.from("payables").update({
      status: "paid", paid_at: paymentDate, bank_account_id: bankAccountId,
    }).eq("id", paymentDialog.itemId);
    if (updateError) { toast({ title: "Erro", description: updateError.message, variant: "destructive" }); return; }

    await supabase.from("bank_transactions").insert({
      tenant_id: profile.tenant_id, account_id: bankAccountId, type: "debit",
      description: `Pagamento: ${paymentDialog.description}`, amount: paymentDialog.amount,
      transaction_date: paymentDate, payable_id: paymentDialog.itemId,
    });

    // Update bank balance (subtract for payments)
    const { data: account } = await supabase.from("bank_accounts").select("balance").eq("id", bankAccountId).single();
    if (account) {
      await supabase.from("bank_accounts").update({ balance: Number(account.balance) - paymentDialog.amount }).eq("id", bankAccountId);
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
          <h1 className="text-2xl font-bold tracking-tight">Contas a Pagar</h1>
          <p className="text-muted-foreground">Acompanhe suas despesas e pagamentos</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Nova Conta</Button>
      </div>

      <PasswordConfirmDialog open={passwordDialog.open} onOpenChange={(v) => setPasswordDialog((p) => ({ ...p, open: v }))} title={passwordDialog.title} description={passwordDialog.description} onConfirm={passwordDialog.onConfirm} variant={passwordDialog.variant} />

      <PaymentConfirmDialog open={paymentDialog.open} onOpenChange={(v) => setPaymentDialog((p) => ({ ...p, open: v }))} onConfirm={handlePaymentConfirm} title="Confirmar Pagamento" description={`Selecione a conta bancária para registrar o pagamento de R$ ${paymentDialog.amount.toFixed(2)}.`} />

      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditItem(null); }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>{editItem ? "Editar Conta a Pagar" : "Nova Conta a Pagar"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2"><Label>Descrição</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Vencimento</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} required /></div>
            </div>
            <div className="space-y-2">
              <Label>Fornecedor (opcional)</Label>
              <Select value={form.supplier_id} onValueChange={(v) => setForm({ ...form, supplier_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
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

            <AccountingTypeSelect
              kind="payable"
              value={form.accounting_type}
              onChange={(v) => setForm({ ...form, accounting_type: v })}
            />

            <div className="space-y-2">
              <Label>Grupo Contábil <span className="text-muted-foreground text-xs font-normal">(opcional)</span></Label>
              <Input
                value={form.accounting_group}
                onChange={(e) => setForm({ ...form, accounting_group: e.target.value })}
                placeholder="Ex: Pessoal, Marketing, Infraestrutura"
              />
            </div>

            {!editItem && (
              <div className="space-y-3 rounded-lg border border-border p-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Repeat className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="is-recurring" className="cursor-pointer">Tornar conta recorrente</Label>
                  </div>
                  <Switch
                    id="is-recurring"
                    checked={form.is_recurring}
                    onCheckedChange={(v) => setForm({ ...form, is_recurring: v })}
                  />
                </div>

                {form.is_recurring && (
                  <div className="space-y-3 pt-2 border-t border-border">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Frequência</Label>
                        <Select
                          value={form.frequency_type}
                          onValueChange={(v: any) => setForm({ ...form, frequency_type: v })}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monthly">Mensal</SelectItem>
                            <SelectItem value="weekly">Semanal</SelectItem>
                            <SelectItem value="daily">Diária</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">A cada</Label>
                        <Input
                          type="number"
                          min="1"
                          value={form.frequency_interval}
                          onChange={(e) => setForm({ ...form, frequency_interval: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Data de término <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                      <Input
                        type="date"
                        value={form.end_date}
                        onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">Deixe vazio para recorrência infinita</p>
                    </div>
                  </div>
                )}
              </div>
            )}

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
                <TableHead>Descrição</TableHead><TableHead>Fornecedor</TableHead><TableHead>Categoria</TableHead><TableHead>Classif. Contábil</TableHead><TableHead>Vencimento</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow> :
              filtered.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma conta encontrada</TableCell></TableRow> :
              filtered.map((p) => (
                <TableRow key={p.id} className={`border-border ${isOverdue(p) ? "bg-destructive/5" : ""}`}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {p.description}
                      {p.recurrence_id && (
                        <Badge variant="outline" className="text-[10px] gap-1 h-5">
                          <Repeat className="h-2.5 w-2.5" />
                          {p.is_recurring_template ? "Recorrente (Original)" : "Recorrente"}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.suppliers?.name || "—"}</TableCell>
                  <TableCell>
                    {(p as any).finance_categories ? (
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span className="inline-block h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: (p as any).finance_categories.color || '#6B7280' }} />
                        {(p as any).finance_categories.name}
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell><AccountingTypeBadge type={p.accounting_type} /></TableCell>
                  <TableCell className={isOverdue(p) ? "text-destructive font-medium" : ""}>{new Date(p.due_date).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell><Badge variant={p.status === "paid" ? "default" : isOverdue(p) ? "destructive" : "secondary"}>{isOverdue(p) ? "Vencido" : statusLabels[p.status] || p.status}</Badge></TableCell>
                  <TableCell className="text-right font-medium">R$ {Number(p.amount).toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      {p.status === "pending" && (
                        <Button variant="ghost" size="icon" onClick={() => openMarkPaid(p)} title="Marcar como pago" className="h-8 w-8">
                          <CheckCircle className="h-4 w-4 text-success" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)} title="Editar" className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => openDelete(p)} title="Excluir" className="h-8 w-8"><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
