import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, CheckCircle } from "lucide-react";

const statusLabels: Record<string, string> = { pending: "Pendente", paid: "Pago", overdue: "Vencido", canceled: "Cancelado" };
const statusFilter = ["all", "pending", "paid", "overdue", "canceled"];

export default function Receivables() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [customers, setCustomers] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ description: "", amount: "", due_date: "", customer_id: "" });
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    const { data } = await supabase.from("receivables").select("*, customers(name)").order("due_date", { ascending: true });
    setItems(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openDialog = async () => {
    const { data } = await supabase.from("customers").select("id, name").order("name");
    setCustomers(data || []);
    setForm({ description: "", amount: "", due_date: "", customer_id: "" });
    setDialogOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: profile } = await supabase.from("profiles").select("tenant_id").single();
    if (!profile) return;
    const { error } = await supabase.from("receivables").insert({
      tenant_id: profile.tenant_id,
      description: form.description,
      amount: parseFloat(form.amount),
      due_date: form.due_date,
      customer_id: form.customer_id || null,
    });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Conta a receber criada!" }); setDialogOpen(false); fetchData(); }
  };

  const markPaid = async (id: string) => {
    const { error } = await supabase.from("receivables").update({ status: "paid", paid_at: new Date().toISOString().split("T")[0] }).eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Marcado como pago!" }); fetchData(); }
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
        <Button onClick={openDialog}><Plus className="mr-2 h-4 w-4" />Nova Conta</Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Nova Conta a Receber</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2"><Label>Descrição</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Vencimento</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} required /></div>
            </div>
            <div className="space-y-2">
              <Label>Cliente (opcional)</Label>
              <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
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
                <TableHead>Cliente</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow> :
              filtered.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum recebível encontrado</TableCell></TableRow> :
              filtered.map((r) => (
                <TableRow key={r.id} className={`border-border ${isOverdue(r) ? "bg-destructive/5" : ""}`}>
                  <TableCell className="font-medium">{r.description}</TableCell>
                  <TableCell className="text-muted-foreground">{r.customers?.name || "—"}</TableCell>
                  <TableCell className={isOverdue(r) ? "text-destructive font-medium" : ""}>{new Date(r.due_date).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === "paid" ? "default" : isOverdue(r) ? "destructive" : "secondary"}>
                      {isOverdue(r) ? "Vencido" : statusLabels[r.status] || r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">R$ {Number(r.amount).toFixed(2)}</TableCell>
                  <TableCell>
                    {r.status === "pending" && (
                      <Button variant="ghost" size="icon" onClick={() => markPaid(r.id)} title="Marcar como pago" className="h-8 w-8">
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
