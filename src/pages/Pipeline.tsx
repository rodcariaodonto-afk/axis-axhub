import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, GripVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Stage { id: string; name: string; order: number; probability: number; }
interface Deal { id: string; name: string; estimated_value: number; stage_id: string; status: string; expected_close_date: string | null; leads?: { name: string } | null; contacts?: { first_name: string; last_name: string | null } | null; }

export default function Pipeline() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pipelineId, setPipelineId] = useState("");
  const [form, setForm] = useState({ name: "", estimated_value: "", expected_close_date: "", stage_id: "" });
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    const { data: pipeline } = await supabase.from("sales_pipelines").select("id").eq("is_default", true).single();
    if (!pipeline) { setLoading(false); return; }
    setPipelineId(pipeline.id);
    const [{ data: s }, { data: d }] = await Promise.all([
      supabase.from("pipeline_stages").select("*").eq("pipeline_id", pipeline.id).order("order"),
      supabase.from("deals").select("*, leads(name), contacts(first_name, last_name)").eq("pipeline_id", pipeline.id).neq("status", "lost"),
    ]);
    setStages(s || []); setDeals(d || []); setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = (stageId?: string) => {
    setForm({ name: "", estimated_value: "", expected_close_date: "", stage_id: stageId || (stages[0]?.id || "") });
    setDialogOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: profile } = await supabase.from("profiles").select("tenant_id").single();
    if (!profile) return;
    const { error } = await supabase.from("deals").insert({
      tenant_id: profile.tenant_id, pipeline_id: pipelineId, stage_id: form.stage_id, name: form.name,
      estimated_value: parseFloat(form.estimated_value) || 0, expected_close_date: form.expected_close_date || null,
    });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Deal criado!" }); setDialogOpen(false); fetchData(); }
  };

  const handleDragStart = (e: React.DragEvent, dealId: string) => { e.dataTransfer.setData("dealId", dealId); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = async (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    const dealId = e.dataTransfer.getData("dealId");
    if (!dealId) return;
    setDeals((prev) => prev.map((d) => d.id === dealId ? { ...d, stage_id: stageId } : d));
    await supabase.from("deals").update({ stage_id: stageId }).eq("id", dealId);
  };

  const stageDeals = (stageId: string) => deals.filter((d) => d.stage_id === stageId);
  const stageTotal = (stageId: string) => stageDeals(stageId).reduce((s, d) => s + Number(d.estimated_value), 0);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Pipeline de Vendas</h1><p className="text-muted-foreground">Visualize e gerencie seus deals</p></div>
        <Button onClick={() => openCreate()}><Plus className="mr-2 h-4 w-4" />Novo Deal</Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Novo Deal</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Valor Estimado (R$)</Label><Input type="number" step="0.01" value={form.estimated_value} onChange={(e) => setForm({ ...form, estimated_value: e.target.value })} /></div>
              <div className="space-y-2"><Label>Previsão de Fechamento</Label><Input type="date" value={form.expected_close_date} onChange={(e) => setForm({ ...form, expected_close_date: e.target.value })} /></div>
            </div>
            <div className="space-y-2">
              <Label>Etapa</Label>
              <Select value={form.stage_id} onValueChange={(v) => setForm({ ...form, stage_id: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <Button type="submit" className="w-full">Criar Deal</Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 400 }}>
        {stages.map((stage) => (
          <div key={stage.id} className="flex-shrink-0 w-72" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, stage.id)}>
            <div className="bg-muted/30 rounded-lg p-3 h-full">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-sm">{stage.name}</h3>
                  <p className="text-xs text-muted-foreground">{stageDeals(stage.id).length} deals · R$ {stageTotal(stage.id).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</p>
                </div>
                <Badge variant="outline" className="text-xs">{stage.probability}%</Badge>
              </div>
              <div className="space-y-2">
                {stageDeals(stage.id).map((deal) => (
                  <Card key={deal.id} className="border-border bg-card cursor-grab active:cursor-grabbing" draggable onDragStart={(e) => handleDragStart(e, deal.id)} onClick={() => navigate(`/deals/${deal.id}`)}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{deal.name}</p>
                          {deal.leads?.name && <p className="text-xs text-muted-foreground truncate">{deal.leads.name}</p>}
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-sm font-semibold text-primary">R$ {Number(deal.estimated_value).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</span>
                            {deal.expected_close_date && <span className="text-xs text-muted-foreground">{new Date(deal.expected_close_date).toLocaleDateString("pt-BR")}</span>}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => openCreate(stage.id)}>
                  <Plus className="mr-1 h-3 w-3" />Adicionar
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
