import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Download } from "lucide-react";
import { emitEvent } from "@/lib/emitEvent";
import { KanbanColumn, type Stage } from "@/components/kanban/KanbanColumn";
import { KanbanFilters } from "@/components/kanban/KanbanFilters";
import { CardDetailModal } from "@/components/kanban/CardDetailModal";
import type { Deal } from "@/components/kanban/KanbanCard";

export default function Pipeline() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pipelineId, setPipelineId] = useState("");
  const [form, setForm] = useState({ name: "", estimated_value: "", expected_close_date: "", stage_id: "", prioridade: "normal" });
  const [search, setSearch] = useState("");
  const [filterPrioridade, setFilterPrioridade] = useState("todas");
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    const { data: pipeline } = await supabase.from("sales_pipelines").select("id").eq("is_default", true).single();
    if (!pipeline) { setLoading(false); return; }
    setPipelineId(pipeline.id);
    const [{ data: s }, { data: d }] = await Promise.all([
      supabase.from("pipeline_stages").select("*").eq("pipeline_id", pipeline.id).order("order"),
      supabase.from("deals").select("*, leads(name), contacts(first_name, last_name)").eq("pipeline_id", pipeline.id).neq("status", "lost"),
    ]);
    setStages((s || []).map((st: any) => ({ ...st, cor_hex: st.cor_hex || "#3B82F6" })));
    setDeals((d || []).map((dl: any) => ({ ...dl, prioridade: dl.prioridade || "normal", tags: dl.tags || [], probabilidade_percentual: dl.probabilidade_percentual ?? 50 })));
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredDeals = useMemo(() => {
    let result = deals;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((d) => d.name.toLowerCase().includes(q) || d.leads?.name?.toLowerCase().includes(q));
    }
    if (filterPrioridade !== "todas") {
      result = result.filter((d) => d.prioridade === filterPrioridade);
    }
    return result;
  }, [deals, search, filterPrioridade]);

  const openCreate = (stageId?: string) => {
    setForm({ name: "", estimated_value: "", expected_close_date: "", stage_id: stageId || (stages[0]?.id || ""), prioridade: "normal" });
    setDialogOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: profile } = await supabase.from("profiles").select("tenant_id").single();
    if (!profile) return;
    const { data: newDeal, error } = await supabase.from("deals").insert({
      tenant_id: profile.tenant_id, pipeline_id: pipelineId, stage_id: form.stage_id, name: form.name,
      estimated_value: parseFloat(form.estimated_value) || 0, expected_close_date: form.expected_close_date || null,
      prioridade: form.prioridade,
    }).select().single();
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else {
      // Log creation history
      await supabase.from("deal_history").insert({
        tenant_id: profile.tenant_id, deal_id: newDeal.id, tipo_acao: "criado",
        coluna_destino_id: form.stage_id, usuario_id: (await supabase.auth.getUser()).data.user?.id,
      });
      emitEvent("deal.created", { deal_id: newDeal.id, name: newDeal.name, value: newDeal.estimated_value, stage_id: newDeal.stage_id });
      toast({ title: "Deal criado!" }); setDialogOpen(false); fetchData();
    }
  };

  const handleDragStart = (e: React.DragEvent, dealId: string) => { e.dataTransfer.setData("dealId", dealId); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = async (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    const dealId = e.dataTransfer.getData("dealId");
    if (!dealId) return;
    const deal = deals.find((d) => d.id === dealId);
    const oldStageId = deal?.stage_id;
    if (oldStageId === stageId) return;
    setDeals((prev) => prev.map((d) => d.id === dealId ? { ...d, stage_id: stageId } : d));
    await supabase.from("deals").update({ stage_id: stageId }).eq("id", dealId);

    const { data: profile } = await supabase.from("profiles").select("tenant_id").single();
    if (profile) {
      await supabase.from("deal_history").insert({
        tenant_id: profile.tenant_id, deal_id: dealId, tipo_acao: "movido",
        coluna_origem_id: oldStageId!, coluna_destino_id: stageId,
        usuario_id: (await supabase.auth.getUser()).data.user?.id,
      });
    }
    emitEvent("deal.stage_changed", { deal_id: dealId, old_stage_id: oldStageId, new_stage_id: stageId });
  };

  const exportDealsCsv = () => {
    const stageMap = Object.fromEntries(stages.map((s) => [s.id, s.name]));
    const header = "Nome,Valor,Etapa,Status,Prioridade,Previsão Fechamento";
    const rows = deals.map((d) =>
      `"${d.name}",${d.estimated_value},"${stageMap[d.stage_id] || ""}","${d.status}","${d.prioridade}","${d.expected_close_date || ""}"`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "deals.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleCardClick = (deal: Deal) => { setSelectedDeal(deal); setDetailOpen(true); };

  const stageDeals = (stageId: string) => filteredDeals.filter((d) => d.stage_id === stageId);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pipeline de Vendas</h1>
          <p className="text-muted-foreground">Visualize e gerencie seus deals</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportDealsCsv}><Download className="mr-2 h-4 w-4" />Exportar CSV</Button>
          <Button onClick={() => openCreate()}><Plus className="mr-2 h-4 w-4" />Novo Deal</Button>
        </div>
      </div>

      <KanbanFilters search={search} onSearchChange={setSearch} prioridade={filterPrioridade} onPrioridadeChange={setFilterPrioridade} />

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Novo Deal</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" step="0.01" value={form.estimated_value} onChange={(e) => setForm({ ...form, estimated_value: e.target.value })} /></div>
              <div className="space-y-2"><Label>Prev. Fechamento</Label><Input type="date" value={form.expected_close_date} onChange={(e) => setForm({ ...form, expected_close_date: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Etapa</Label>
                <Select value={form.stage_id} onValueChange={(v) => setForm({ ...form, stage_id: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={form.prioridade} onValueChange={(v) => setForm({ ...form, prioridade: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="baixa">Baixa</SelectItem><SelectItem value="normal">Normal</SelectItem><SelectItem value="alta">Alta</SelectItem><SelectItem value="urgente">Urgente</SelectItem></SelectContent></Select>
              </div>
            </div>
            <Button type="submit" className="w-full">Criar Deal</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Kanban board */}
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 400 }}>
        {stages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            deals={stageDeals(stage.id)}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onCardClick={handleCardClick}
            onAddClick={openCreate}
          />
        ))}
      </div>

      {/* Detail modal */}
      <CardDetailModal
        deal={selectedDeal}
        stages={stages}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onRefresh={fetchData}
      />
    </div>
  );
}
