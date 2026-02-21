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
import { Plus, CheckCircle } from "lucide-react";

const statusLabels: Record<string, string> = { pending: "Pendente", paid: "Pago", overdue: "Vencido", canceled: "Cancelado" };
const statusFilter = ["all", "pending", "paid", "overdue", "canceled"];

export default function Payables() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ description: "", amount: "", due_date: "", supplier_id: "" });
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    const { data } = await supabase.from("payables").select("*, suppliers(name)").order("due_date", { ascending: true });
    setItems(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openDialog = async () => {
    const { data } = await supabase.from("suppliers").select("id, name").order("name");
    setSuppliers(data || []);
    setForm({ description: "", amount: "", due_date: "", supplier_id: "" });
    setDialogOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: profile } = await supabase.from("profiles").select("tenant_id").single();
    if (!profile) return;
    const { error } = await supabase.from("payables").insert({
      tenant_id: profile.tenant_id,
      description: form.description,
      amount: parseFloat(form.amount),
      due_date: form.due_date,
      supplier_id: form.supplier_id || null,
    });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Conta a pagar criada!" }); setDialogOpen(false); fetchData(); }
  };

  const markPaid = async (id: string) => {
    const { error } = await supabase.from("payables").update({ status: "paid", paid_at: new Date().toISOString().split("T")[0] }).eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Marcado como pago!" }); fetchData(); }
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
        <Button onClick={openDialog}><Plus className="mr-2 h-4 w-4" />Nova Conta</Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Nova Conta a Pagar</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
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
            <Button type="submit" className="w-full">Criar</Button>
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
                <TableHead>Descrição</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow> :
              filtered.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma conta encontrada</TableCell></TableRow> :
              filtered.map((p) => (
                <TableRow key={p.id} className={`border-border ${isOverdue(p) ? "bg-destructive/5" : ""}`}>
                  <TableCell className="font-medium">{p.description}</TableCell>
                  <TableCell className="text-muted-foreground">{p.suppliers?.name || "—"}</TableCell>
                  <TableCell className={isOverdue(p) ? "text-destructive font-medium" : ""}>{new Date(p.due_date).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === "paid" ? "default" : isOverdue(p) ? "destructive" : "secondary"}>
                      {isOverdue(p) ? "Vencido" : statusLabels[p.status] || p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">R$ {Number(p.amount).toFixed(2)}</TableCell>
                  <TableCell>
                    {p.status === "pending" && (
                      <Button variant="ghost" size="icon" onClick={() => markPaid(p.id)} title="Marcar como pago" className="h-8 w-8">
                        <CheckCircle className="h-4 w-4 text-success" />
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
