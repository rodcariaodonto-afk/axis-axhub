import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Trophy, XCircle, Trash2, Clock, MessageSquare } from "lucide-react";
import { emitEvent } from "@/lib/emitEvent";
import { DealWhatsAppTab } from "./DealWhatsAppTab";
import type { Deal } from "./KanbanCard";
import type { Stage } from "./KanbanColumn";

interface CardDetailModalProps {
  deal: Deal | null;
  stages: Stage[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
}

export function CardDetailModal({ deal, stages, open, onOpenChange, onRefresh }: CardDetailModalProps) {
  const [form, setForm] = useState({ name: "", descricao: "", observacoes: "", estimated_value: "", expected_close_date: "", prioridade: "normal", tags: "", probabilidade_percentual: "50", stage_id: "" });
  const [history, setHistory] = useState<any[]>([]);
  const [lostDialog, setLostDialog] = useState(false);
  const [lostReason, setLostReason] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (deal) {
      setForm({
        name: deal.name,
        descricao: (deal as any).descricao || "",
        observacoes: (deal as any).observacoes || "",
        estimated_value: String(deal.estimated_value || 0),
        expected_close_date: deal.expected_close_date || "",
        prioridade: deal.prioridade || "normal",
        tags: (deal.tags || []).join(", "),
        probabilidade_percentual: String((deal as any).probabilidade_percentual || 50),
        stage_id: deal.stage_id,
      });
      fetchHistory(deal.id);
    }
  }, [deal]);

  const fetchHistory = async (dealId: string) => {
    const { data } = await supabase.from("deal_history").select("*").eq("deal_id", dealId).order("created_at", { ascending: false }).limit(50);
    setHistory(data || []);
  };

  const handleSave = async () => {
    if (!deal) return;
    const tagsArr = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
    const oldStageId = deal.stage_id;

    const { error } = await supabase.from("deals").update({
      name: form.name,
      descricao: form.descricao || null,
      observacoes: form.observacoes || null,
      estimated_value: parseFloat(form.estimated_value) || 0,
      expected_close_date: form.expected_close_date || null,
      prioridade: form.prioridade,
      tags: tagsArr,
      probabilidade_percentual: parseInt(form.probabilidade_percentual) || 50,
      stage_id: form.stage_id,
    }).eq("id", deal.id);

    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }

    // Log history for stage change
    if (oldStageId !== form.stage_id) {
      const { data: profile } = await supabase.from("profiles").select("tenant_id").single();
      if (profile) {
        await supabase.from("deal_history").insert({
          tenant_id: profile.tenant_id, deal_id: deal.id, tipo_acao: "movido",
          coluna_origem_id: oldStageId, coluna_destino_id: form.stage_id, usuario_id: (await supabase.auth.getUser()).data.user?.id,
        });
        emitEvent("deal.stage_changed", { deal_id: deal.id, old_stage_id: oldStageId, new_stage_id: form.stage_id });
      }
    }

    toast({ title: "Deal atualizado!" });
    onRefresh();
    onOpenChange(false);
  };

  const markWon = async () => {
    if (!deal) return;
    await supabase.from("deals").update({ status: "won" }).eq("id", deal.id);
    emitEvent("deal.won", { deal_id: deal.id, name: deal.name, value: deal.estimated_value });

    try {
      const { data: profile } = await supabase.from("profiles").select("tenant_id").single();
      if (profile) {
        await supabase.from("deal_history").insert({
          tenant_id: profile.tenant_id, deal_id: deal.id, tipo_acao: "editado",
          campo_alterado: "status", valor_anterior: "open", valor_novo: "won",
          usuario_id: (await supabase.auth.getUser()).data.user?.id,
        });

        // Auto-create order with deal_id linkage
        let customerId: string | null = null;

        // Try to link via crm_contact_id first
        if ((deal as any).contact_id) {
          const { data: existingByContact } = await supabase.from("customers").select("id").eq("crm_contact_id", (deal as any).contact_id).maybeSingle();
          if (existingByContact) {
            customerId = existingByContact.id;
          } else {
            // Create customer linked to CRM contact
            const contactName = deal.contacts ? `${deal.contacts.first_name} ${deal.contacts.last_name || ""}`.trim() : null;
            if (contactName) {
              const { data: newC } = await supabase.from("customers").insert({ tenant_id: profile.tenant_id, name: contactName, crm_contact_id: (deal as any).contact_id }).select("id").single();
              if (newC) customerId = newC.id;
            }
          }
        }

        // Fallback: use lead name
        if (!customerId && deal.leads) {
          const { data: existing } = await supabase.from("customers").select("id").eq("name", deal.leads.name).maybeSingle();
          if (existing) customerId = existing.id;
          else {
            const { data: newC } = await supabase.from("customers").insert({ tenant_id: profile.tenant_id, name: deal.leads.name }).select("id").single();
            if (newC) customerId = newC.id;
          }
        }

        const orderNumber = `PED-${Date.now().toString(36).toUpperCase()}`;
        await supabase.from("orders").insert({ tenant_id: profile.tenant_id, number: orderNumber, customer_id: customerId, deal_id: deal.id, source: "crm", status: "draft", total: Number(deal.estimated_value) || 0, subtotal: Number(deal.estimated_value) || 0, notes: `Gerado do deal: ${deal.name}` } as any);
        toast({ title: "Deal ganho! 🎉", description: `Pedido ${orderNumber} criado.` });
      }
    } catch {
      toast({ title: "Deal ganho! 🎉" });
    }
    onRefresh();
    onOpenChange(false);
  };

  const markLost = async () => {
    if (!deal) return;
    await supabase.from("deals").update({ status: "lost", lost_reason: lostReason || null }).eq("id", deal.id);
    emitEvent("deal.lost", { deal_id: deal.id, name: deal.name, reason: lostReason });
    const { data: profile } = await supabase.from("profiles").select("tenant_id").single();
    if (profile) {
      await supabase.from("deal_history").insert({
        tenant_id: profile.tenant_id, deal_id: deal.id, tipo_acao: "editado",
        campo_alterado: "status", valor_anterior: "open", valor_novo: "lost",
        usuario_id: (await supabase.auth.getUser()).data.user?.id, comentario: lostReason || null,
      });
    }
    toast({ title: "Deal perdido." });
    setLostDialog(false);
    onRefresh();
    onOpenChange(false);
  };

  const deleteDeal = async () => {
    if (!deal) return;
    await supabase.from("deals").delete().eq("id", deal.id);
    toast({ title: "Deal excluído." });
    onRefresh();
    onOpenChange(false);
  };

  const acaoLabel: Record<string, string> = { criado: "Criado", movido: "Movido", editado: "Editado", deletado: "Deletado" };

  if (!deal) return null;

  const isOpen = deal.status === "open";

  return (
    <>
      <Dialog open={open && !lostDialog} onOpenChange={onOpenChange}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {deal.name}
              <Badge variant={deal.status === "won" ? "default" : deal.status === "lost" ? "destructive" : "secondary"} className="text-xs">
                {deal.status === "won" ? "Ganho" : deal.status === "lost" ? "Perdido" : "Aberto"}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="detalhes">
            <TabsList className="w-full">
              <TabsTrigger value="detalhes" className="flex-1">Detalhes</TabsTrigger>
              <TabsTrigger value="historico" className="flex-1">Histórico</TabsTrigger>
              <TabsTrigger value="whatsapp" className="flex-1 gap-1"><MessageSquare className="h-3 w-3" />WhatsApp</TabsTrigger>
            </TabsList>

            <TabsContent value="detalhes" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={!isOpen} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor (R$)</Label>
                  <Input type="number" step="0.01" value={form.estimated_value} onChange={(e) => setForm({ ...form, estimated_value: e.target.value })} disabled={!isOpen} />
                </div>
                <div className="space-y-2">
                  <Label>Probabilidade (%)</Label>
                  <Input type="number" min="0" max="100" value={form.probabilidade_percentual} onChange={(e) => setForm({ ...form, probabilidade_percentual: e.target.value })} disabled={!isOpen} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Previsão Fechamento</Label>
                  <Input type="date" value={form.expected_close_date} onChange={(e) => setForm({ ...form, expected_close_date: e.target.value })} disabled={!isOpen} />
                </div>
                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <Select value={form.prioridade} onValueChange={(v) => setForm({ ...form, prioridade: v })} disabled={!isOpen}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {isOpen && (
                <div className="space-y-2">
                  <Label>Etapa</Label>
                  <Select value={form.stage_id} onValueChange={(v) => setForm({ ...form, stage_id: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {stages.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name} ({s.probability}%)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Tags (separadas por vírgula)</Label>
                <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} disabled={!isOpen} placeholder="ex: hot, enterprise" />
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} disabled={!isOpen} rows={2} />
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} disabled={!isOpen} rows={2} />
              </div>

              {/* Contact info */}
              {(deal.leads || deal.contacts) && (
                <div className="border border-border rounded-md p-3 space-y-1 text-sm">
                  <p className="font-medium text-xs text-muted-foreground uppercase">Contato</p>
                  {deal.leads?.name && <p>{deal.leads.name}</p>}
                  {deal.contacts && <p>{deal.contacts.first_name} {deal.contacts.last_name || ""}</p>}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {isOpen && (
                  <>
                    <Button onClick={handleSave} className="flex-1">Salvar</Button>
                    <Button onClick={markWon} variant="outline" className="text-green-400 border-green-400/30 hover:bg-green-400/10">
                      <Trophy className="mr-1 h-4 w-4" />Ganho
                    </Button>
                    <Button variant="destructive" onClick={() => setLostDialog(true)}>
                      <XCircle className="mr-1 h-4 w-4" />Perdido
                    </Button>
                  </>
                )}
                <Button variant="ghost" size="icon" onClick={deleteDeal} className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="historico" className="mt-4">
              {history.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Nenhum histórico registrado</p>
              ) : (
                <div className="space-y-3">
                  {history.map((h) => (
                    <div key={h.id} className="flex items-start gap-3 p-3 rounded-md border border-border">
                      <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1 text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">{acaoLabel[h.tipo_acao] || h.tipo_acao}</Badge>
                          {h.campo_alterado && <span className="text-muted-foreground">{h.campo_alterado}</span>}
                        </div>
                        {h.valor_anterior && h.valor_novo && (
                          <p className="text-xs text-muted-foreground mt-1">{h.valor_anterior} → {h.valor_novo}</p>
                        )}
                        {h.comentario && <p className="text-xs mt-1">{h.comentario}</p>}
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(h.created_at).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="whatsapp" className="mt-4">
              <DealWhatsAppTab
                dealId={deal.id}
                contactName={deal.leads?.name || (deal.contacts ? `${deal.contacts.first_name} ${deal.contacts.last_name || ""}` : null)}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Lost reason dialog */}
      <Dialog open={lostDialog} onOpenChange={setLostDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Motivo da Perda</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Textarea value={lostReason} onChange={(e) => setLostReason(e.target.value)} placeholder="Por que o deal foi perdido?" />
            <Button variant="destructive" onClick={markLost} className="w-full">Confirmar Perda</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
