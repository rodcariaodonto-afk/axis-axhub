import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Trophy, XCircle, Plus, CheckCircle } from "lucide-react";

export default function DealDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [deal, setDeal] = useState<any>(null);
  const [stages, setStages] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actDialog, setActDialog] = useState(false);
  const [lostDialog, setLostDialog] = useState(false);
  const [lostReason, setLostReason] = useState("");
  const [actForm, setActForm] = useState({ title: "", type: "task", description: "", due_at: "" });
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    if (!id) return;
    const [{ data: d }, { data: acts }] = await Promise.all([
      supabase.from("deals").select("*, leads(name, email, phone), contacts(first_name, last_name, email, phone), crm_accounts(name), pipeline_stages(name, probability)").eq("id", id).single(),
      supabase.from("activities").select("*").eq("deal_id", id).order("created_at", { ascending: false }),
    ]);
    if (d) {
      setDeal(d);
      const { data: s } = await supabase.from("pipeline_stages").select("*").eq("pipeline_id", d.pipeline_id).order("order");
      setStages(s || []);
    }
    setActivities(acts || []);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const changeStage = async (stageId: string) => {
    await supabase.from("deals").update({ stage_id: stageId }).eq("id", id);
    toast({ title: "Etapa atualizada!" }); fetchData();
  };

  const markWon = async () => {
    await supabase.from("deals").update({ status: "won" }).eq("id", id);
    toast({ title: "Deal marcado como ganho! 🎉" }); fetchData();
  };

  const markLost = async () => {
    await supabase.from("deals").update({ status: "lost", lost_reason: lostReason || null }).eq("id", id);
    toast({ title: "Deal marcado como perdido." }); setLostDialog(false); fetchData();
  };

  const createActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: profile } = await supabase.from("profiles").select("tenant_id").single();
    if (!profile) return;
    await supabase.from("activities").insert({
      tenant_id: profile.tenant_id, deal_id: id, title: actForm.title, type: actForm.type,
      description: actForm.description || null, due_at: actForm.due_at || null, owner_user_id: profile.tenant_id,
    });
    toast({ title: "Atividade criada!" }); setActDialog(false); fetchData();
  };

  const completeActivity = async (actId: string) => {
    await supabase.from("activities").update({ done_at: new Date().toISOString() }).eq("id", actId);
    toast({ title: "Atividade concluída!" }); fetchData();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!deal) return <div className="text-center py-12 text-muted-foreground">Deal não encontrado</div>;

  const statusColor = deal.status === "won" ? "default" : deal.status === "lost" ? "destructive" : "secondary";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/pipeline")}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{deal.name}</h1>
          <p className="text-muted-foreground">R$ {Number(deal.estimated_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
        </div>
        <Badge variant={statusColor} className="text-sm">{deal.status === "won" ? "Ganho" : deal.status === "lost" ? "Perdido" : "Aberto"}</Badge>
      </div>

      {deal.status === "open" && (
        <div className="flex gap-2">
          {stages.map((s) => (
            <Button key={s.id} variant={deal.stage_id === s.id ? "default" : "outline"} size="sm" onClick={() => changeStage(s.id)}>
              {s.name} ({s.probability}%)
            </Button>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader><CardTitle className="text-base">Informações do Deal</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Etapa:</span> {deal.pipeline_stages?.name}</p>
            <p><span className="text-muted-foreground">Probabilidade:</span> {deal.pipeline_stages?.probability}%</p>
            {deal.expected_close_date && <p><span className="text-muted-foreground">Prev. Fechamento:</span> {new Date(deal.expected_close_date).toLocaleDateString("pt-BR")}</p>}
            {deal.lost_reason && <p><span className="text-muted-foreground">Motivo da perda:</span> {deal.lost_reason}</p>}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader><CardTitle className="text-base">Contato / Lead</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {deal.leads && <><p><span className="text-muted-foreground">Lead:</span> {deal.leads.name}</p>{deal.leads.email && <p><span className="text-muted-foreground">E-mail:</span> {deal.leads.email}</p>}{deal.leads.phone && <p><span className="text-muted-foreground">Tel:</span> {deal.leads.phone}</p>}</>}
            {deal.contacts && <><p><span className="text-muted-foreground">Contato:</span> {deal.contacts.first_name} {deal.contacts.last_name || ""}</p>{deal.contacts.email && <p><span className="text-muted-foreground">E-mail:</span> {deal.contacts.email}</p>}</>}
            {deal.crm_accounts && <p><span className="text-muted-foreground">Empresa:</span> {deal.crm_accounts.name}</p>}
            {!deal.leads && !deal.contacts && !deal.crm_accounts && <p className="text-muted-foreground">Nenhum contato vinculado</p>}
          </CardContent>
        </Card>
      </div>

      {deal.status === "open" && (
        <div className="flex gap-2">
          <Button onClick={markWon} className="bg-success hover:bg-success/90 text-success-foreground"><Trophy className="mr-2 h-4 w-4" />Marcar como Ganho</Button>
          <Button variant="destructive" onClick={() => setLostDialog(true)}><XCircle className="mr-2 h-4 w-4" />Marcar como Perdido</Button>
        </div>
      )}

      <Dialog open={lostDialog} onOpenChange={setLostDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Motivo da Perda</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Textarea value={lostReason} onChange={(e) => setLostReason(e.target.value)} placeholder="Por que o deal foi perdido?" />
            <Button variant="destructive" onClick={markLost} className="w-full">Confirmar Perda</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Atividades</CardTitle>
          <Button size="sm" onClick={() => { setActForm({ title: "", type: "task", description: "", due_at: "" }); setActDialog(true); }}><Plus className="mr-1 h-3 w-3" />Nova</Button>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? <p className="text-center py-6 text-muted-foreground">Nenhuma atividade registrada</p> :
          <div className="space-y-3">
            {activities.map((a) => (
              <div key={a.id} className={`flex items-start gap-3 p-3 rounded-md border border-border ${a.done_at ? "opacity-60" : ""}`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{a.type === "call" ? "Ligação" : a.type === "meeting" ? "Reunião" : a.type === "email" ? "E-mail" : "Tarefa"}</Badge>
                    <span className="font-medium text-sm">{a.title}</span>
                    {a.done_at && <Badge variant="default" className="text-xs">Concluída</Badge>}
                  </div>
                  {a.description && <p className="text-xs text-muted-foreground mt-1">{a.description}</p>}
                  {a.due_at && <p className="text-xs text-muted-foreground mt-1">Prazo: {new Date(a.due_at).toLocaleDateString("pt-BR")}</p>}
                </div>
                {!a.done_at && <Button variant="ghost" size="icon" onClick={() => completeActivity(a.id)} className="h-8 w-8"><CheckCircle className="h-4 w-4 text-success" /></Button>}
              </div>
            ))}
          </div>}
        </CardContent>
      </Card>

      <Dialog open={actDialog} onOpenChange={setActDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Nova Atividade</DialogTitle></DialogHeader>
          <form onSubmit={createActivity} className="space-y-4">
            <div className="space-y-2"><Label>Título</Label><Input value={actForm.title} onChange={(e) => setActForm({ ...actForm, title: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Tipo</Label><Select value={actForm.type} onValueChange={(v) => setActForm({ ...actForm, type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="task">Tarefa</SelectItem><SelectItem value="call">Ligação</SelectItem><SelectItem value="meeting">Reunião</SelectItem><SelectItem value="email">E-mail</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Prazo</Label><Input type="date" value={actForm.due_at} onChange={(e) => setActForm({ ...actForm, due_at: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Descrição</Label><Textarea value={actForm.description} onChange={(e) => setActForm({ ...actForm, description: e.target.value })} /></div>
            <Button type="submit" className="w-full">Criar Atividade</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
