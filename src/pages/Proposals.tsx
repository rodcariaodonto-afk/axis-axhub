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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, Send, CheckCircle, XCircle } from "lucide-react";

const statusLabels: Record<string, string> = {
  draft: "Rascunho", sent: "Enviada", viewed: "Visualizada", accepted: "Aceita", rejected: "Rejeitada",
};
const statusColors: Record<string, string> = {
  draft: "secondary", sent: "outline", viewed: "default", accepted: "default", rejected: "destructive",
};

export default function Proposals() {
  const [proposals, setProposals] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ deal_id: "", total_amount: "", valid_until: "", notes: "" });
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    const [{ data: p }, { data: d }] = await Promise.all([
      supabase.from("proposals").select("*, deals(name, estimated_value)").order("created_at", { ascending: false }),
      supabase.from("deals").select("id, name, estimated_value").eq("status", "open").order("name"),
    ]);
    setProposals(p || []);
    setDeals(d || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: profile } = await supabase.from("profiles").select("tenant_id").single();
    if (!profile) return;
    const number = `PROP-${Date.now().toString(36).toUpperCase()}`;
    const { error } = await supabase.from("proposals").insert({
      tenant_id: profile.tenant_id,
      deal_id: form.deal_id || null,
      number,
      total_amount: parseFloat(form.total_amount) || 0,
      valid_until: form.valid_until || null,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Proposta criada!", description: `Número: ${number}` });
    setForm({ deal_id: "", total_amount: "", valid_until: "", notes: "" });
    setDialogOpen(false);
    fetchData();
  };

  const changeStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === "sent") updates.sent_at = new Date().toISOString();
    await supabase.from("proposals").update(updates).eq("id", id);
    toast({ title: `Proposta ${statusLabels[status].toLowerCase()}!` });
    fetchData();
  };

  const filtered = proposals.filter((p) => filterStatus === "all" || p.status === filterStatus);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Propostas</h1>
          <p className="text-muted-foreground">Gerencie propostas e orçamentos comerciais</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Nova Proposta</Button></DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>Nova Proposta</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Deal (opcional)</Label>
                <Select value={form.deal_id} onValueChange={(v) => setForm({ ...form, deal_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Vincular a um deal" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {deals.map((d) => <SelectItem key={d.id} value={d.id}>{d.name} — R$ {Number(d.estimated_value).toFixed(2)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Valor Total</Label><Input type="number" step="0.01" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Válida até</Label><Input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} /></div>
              </div>
              <Button type="submit" className="w-full">Criar Proposta</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Select value={filterStatus} onValueChange={setFilterStatus}>
        <SelectTrigger className="w-48"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os status</SelectItem>
          {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
        </SelectContent>
      </Select>

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>Número</TableHead>
                <TableHead>Deal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Válida até</TableHead>
                <TableHead>Criada em</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma proposta encontrada</TableCell></TableRow>
              ) : filtered.map((p) => (
                <TableRow key={p.id} className="border-border">
                  <TableCell className="font-mono text-xs">{p.number}</TableCell>
                  <TableCell className="font-medium">{p.deals?.name || "—"}</TableCell>
                  <TableCell><Badge variant={statusColors[p.status] as any || "secondary"}>{statusLabels[p.status] || p.status}</Badge></TableCell>
                  <TableCell className="text-right font-medium">R$ {Number(p.total_amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-muted-foreground">{p.valid_until ? new Date(p.valid_until).toLocaleDateString("pt-BR") : "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{new Date(p.created_at).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {p.status === "draft" && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => changeStatus(p.id, "sent")} title="Enviar">
                          <Send className="h-3 w-3" />
                        </Button>
                      )}
                      {(p.status === "sent" || p.status === "viewed") && (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => changeStatus(p.id, "accepted")} title="Aceitar">
                            <CheckCircle className="h-3 w-3 text-success" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => changeStatus(p.id, "rejected")} title="Rejeitar">
                            <XCircle className="h-3 w-3 text-destructive" />
                          </Button>
                        </>
                      )}
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
