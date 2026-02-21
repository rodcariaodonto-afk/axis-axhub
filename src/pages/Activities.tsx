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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, CheckCircle } from "lucide-react";

const typeLabels: Record<string, string> = { task: "Tarefa", call: "Ligação", meeting: "Reunião", email: "E-mail" };

export default function Activities() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deals, setDeals] = useState<any[]>([]);
  const [form, setForm] = useState({ title: "", type: "task", description: "", due_at: "", deal_id: "" });
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    const { data } = await supabase.from("activities").select("*, deals(name)").order("created_at", { ascending: false });
    setItems(data || []); setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openDialog = async () => {
    const { data } = await supabase.from("deals").select("id, name").eq("status", "open").order("name");
    setDeals(data || []);
    setForm({ title: "", type: "task", description: "", due_at: "", deal_id: "" });
    setDialogOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: profile } = await supabase.from("profiles").select("tenant_id").single();
    if (!profile) return;
    const { error } = await supabase.from("activities").insert({
      tenant_id: profile.tenant_id, title: form.title, type: form.type,
      description: form.description || null, due_at: form.due_at || null,
      deal_id: form.deal_id || null,
    });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Atividade criada!" }); setDialogOpen(false); fetchData(); }
  };

  const complete = async (id: string) => {
    await supabase.from("activities").update({ done_at: new Date().toISOString() }).eq("id", id);
    toast({ title: "Atividade concluída!" }); fetchData();
  };

  const filtered = items.filter((a) => {
    if (filter === "pending") return !a.done_at;
    if (filter === "done") return !!a.done_at;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Atividades</h1><p className="text-muted-foreground">Gerencie suas tarefas e compromissos</p></div>
        <Button onClick={openDialog}><Plus className="mr-2 h-4 w-4" />Nova Atividade</Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Nova Atividade</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2"><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Tipo</Label><Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Prazo</Label><Input type="date" value={form.due_at} onChange={(e) => setForm({ ...form, due_at: e.target.value })} /></div>
            </div>
            <div className="space-y-2">
              <Label>Deal (opcional)</Label>
              <Select value={form.deal_id} onValueChange={(v) => setForm({ ...form, deal_id: v })}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{deals.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-2"><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <Button type="submit" className="w-full">Criar</Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="flex gap-2">
        {[{ k: "pending", l: "Pendentes" }, { k: "done", l: "Concluídas" }, { k: "all", l: "Todas" }].map((f) => (
          <Button key={f.k} variant={filter === f.k ? "default" : "outline"} size="sm" onClick={() => setFilter(f.k)}>{f.l}</Button>
        ))}
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="border-border"><TableHead>Título</TableHead><TableHead>Tipo</TableHead><TableHead>Deal</TableHead><TableHead>Prazo</TableHead><TableHead>Status</TableHead><TableHead className="w-10" /></TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow> :
              filtered.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma atividade</TableCell></TableRow> :
              filtered.map((a) => (
                <TableRow key={a.id} className="border-border">
                  <TableCell className="font-medium">{a.title}</TableCell>
                  <TableCell><Badge variant="outline">{typeLabels[a.type] || a.type}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{a.deals?.name || "—"}</TableCell>
                  <TableCell>{a.due_at ? new Date(a.due_at).toLocaleDateString("pt-BR") : "—"}</TableCell>
                  <TableCell><Badge variant={a.done_at ? "default" : "secondary"}>{a.done_at ? "Concluída" : "Pendente"}</Badge></TableCell>
                  <TableCell>
                    {!a.done_at && <Button variant="ghost" size="icon" onClick={() => complete(a.id)} className="h-8 w-8"><CheckCircle className="h-4 w-4 text-success" /></Button>}
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
