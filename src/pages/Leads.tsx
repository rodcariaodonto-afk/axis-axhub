import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, MoreHorizontal, ArrowRightCircle, Pencil, Trash2 } from "lucide-react";

const statusLabels: Record<string, string> = { new: "Novo", contacted: "Contatado", qualified: "Qualificado", unqualified: "Desqualificado", converted: "Convertido" };
const sourceLabels: Record<string, string> = { manual: "Manual", website: "Website", referral: "Indicação", social: "Redes Sociais", ads: "Anúncios" };

export default function Leads() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [convertDialog, setConvertDialog] = useState(false);
  const [convertLead, setConvertLead] = useState<any>(null);
  const [dealName, setDealName] = useState("");
  const [dealValue, setDealValue] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", source: "manual", score: "0", notes: "" });
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
    setLeads(data || []); setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => { setEditingId(null); setForm({ name: "", email: "", phone: "", source: "manual", score: "0", notes: "" }); setDialogOpen(true); };
  const openEdit = (lead: any) => { setEditingId(lead.id); setForm({ name: lead.name, email: lead.email || "", phone: lead.phone || "", source: lead.source || "manual", score: String(lead.score || 0), notes: lead.notes || "" }); setDialogOpen(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      const { error } = await supabase.from("leads").update({ name: form.name, email: form.email || null, phone: form.phone || null, source: form.source, score: parseInt(form.score) || 0, notes: form.notes || null }).eq("id", editingId);
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else { toast({ title: "Lead atualizado!" }); setDialogOpen(false); fetchData(); }
    } else {
      const { data: profile } = await supabase.from("profiles").select("tenant_id").single();
      if (!profile) return;
      const { error } = await supabase.from("leads").insert({ tenant_id: profile.tenant_id, name: form.name, email: form.email || null, phone: form.phone || null, source: form.source, score: parseInt(form.score) || 0, notes: form.notes || null });
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else { toast({ title: "Lead criado!" }); setDialogOpen(false); fetchData(); }
    }
  };

  const deleteLead = async (id: string) => {
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Lead excluído!" }); fetchData(); }
  };

  const openConvert = (lead: any) => { setConvertLead(lead); setDealName(lead.name); setDealValue(""); setConvertDialog(true); };

  const handleConvert = async () => {
    if (!convertLead) return;
    const { data: profile } = await supabase.from("profiles").select("tenant_id").single();
    if (!profile) return;
    const { data: pipeline } = await supabase.from("sales_pipelines").select("id").eq("is_default", true).single();
    if (!pipeline) { toast({ title: "Erro", description: "Nenhum pipeline padrão encontrado.", variant: "destructive" }); return; }
    const { data: firstStage } = await supabase.from("pipeline_stages").select("id").eq("pipeline_id", pipeline.id).order("order", { ascending: true }).limit(1).single();
    if (!firstStage) return;

    const { error } = await supabase.from("deals").insert({
      tenant_id: profile.tenant_id, pipeline_id: pipeline.id, stage_id: firstStage.id, name: dealName,
      lead_id: convertLead.id, estimated_value: parseFloat(dealValue) || 0,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    await supabase.from("leads").update({ status: "converted" }).eq("id", convertLead.id);
    toast({ title: "Lead convertido em deal!" }); setConvertDialog(false); fetchData();
  };

  const filtered = leads.filter((l) => {
    const matchSearch = l.name.toLowerCase().includes(search.toLowerCase()) || (l.email || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || l.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Leads</h1><p className="text-muted-foreground">Gerencie seus leads de vendas</p></div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Novo Lead</Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>{editingId ? "Editar Lead" : "Novo Lead"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="space-y-2"><Label>Telefone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Fonte</Label><Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(sourceLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Score</Label><Input type="number" min="0" max="100" value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Notas</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <Button type="submit" className="w-full">{editingId ? "Salvar" : "Criar Lead"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={convertDialog} onOpenChange={setConvertDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Converter Lead em Deal</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nome do Deal</Label><Input value={dealName} onChange={(e) => setDealName(e.target.value)} required /></div>
            <div className="space-y-2"><Label>Valor Estimado (R$)</Label><Input type="number" step="0.01" value={dealValue} onChange={(e) => setDealValue(e.target.value)} /></div>
            <Button onClick={handleConvert} className="w-full">Converter</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex gap-4 items-center">
        <div className="relative max-w-sm flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar leads..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="border-border"><TableHead>Nome</TableHead><TableHead>E-mail</TableHead><TableHead>Fonte</TableHead><TableHead>Score</TableHead><TableHead>Status</TableHead><TableHead className="w-10" /></TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow> :
              filtered.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum lead encontrado</TableCell></TableRow> :
              filtered.map((l) => (
                <TableRow key={l.id} className="border-border">
                  <TableCell className="font-medium">{l.name}</TableCell>
                  <TableCell className="text-muted-foreground">{l.email || "—"}</TableCell>
                  <TableCell><Badge variant="secondary">{sourceLabels[l.source] || l.source}</Badge></TableCell>
                  <TableCell><Badge variant={l.score >= 70 ? "default" : l.score >= 40 ? "secondary" : "outline"}>{l.score}</Badge></TableCell>
                  <TableCell><Badge variant={l.status === "converted" ? "default" : l.status === "qualified" ? "default" : "secondary"}>{statusLabels[l.status] || l.status}</Badge></TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(l)}><Pencil className="mr-2 h-3 w-3" />Editar</DropdownMenuItem>
                        {l.status !== "converted" && <DropdownMenuItem onClick={() => openConvert(l)}><ArrowRightCircle className="mr-2 h-3 w-3" />Converter em Deal</DropdownMenuItem>}
                        <DropdownMenuItem onClick={() => deleteLead(l.id)} className="text-destructive"><Trash2 className="mr-2 h-3 w-3" />Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
