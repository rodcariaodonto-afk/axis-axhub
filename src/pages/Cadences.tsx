import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Zap } from "lucide-react";
import { emitEvent } from "@/lib/emitEvent";

const stepTypeLabels: Record<string, string> = { email: "E-mail", call: "Ligação", task: "Tarefa", sms: "SMS" };

export default function Cadences() {
  const [cadences, setCadences] = useState<any[]>([]);
  const [steps, setSteps] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [stepDialog, setStepDialog] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [stepForm, setStepForm] = useState({ type: "email", delay_days: "1", description: "" });
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    const { data: c } = await supabase.from("sales_cadences").select("*").order("created_at", { ascending: false });
    setCadences(c || []);
    if (c && c.length > 0) {
      const { data: s } = await supabase.from("cadence_steps").select("*").order("step_number");
      const map: Record<string, any[]> = {};
      (s || []).forEach((step: any) => {
        if (!map[step.cadence_id]) map[step.cadence_id] = [];
        map[step.cadence_id].push(step);
      });
      setSteps(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: profile } = await supabase.from("profiles").select("tenant_id").single();
    if (!profile) return;
    const { error } = await supabase.from("sales_cadences").insert({
      tenant_id: profile.tenant_id, name: form.name, description: form.description || null,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Cadência criada!" });
    setForm({ name: "", description: "" }); setDialogOpen(false); fetchData();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("sales_cadences").update({ is_active: !current }).eq("id", id);
    const cadence = cadences.find((c) => c.id === id);
    if (!current) {
      emitEvent("cadence.started", { cadence_id: id, name: cadence?.name });
    } else {
      emitEvent("cadence.completed", { cadence_id: id, name: cadence?.name });
    }
    fetchData();
  };

  const deleteCadence = async (id: string) => {
    await supabase.from("sales_cadences").delete().eq("id", id);
    toast({ title: "Cadência removida!" }); fetchData();
  };

  const addStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stepDialog) return;
    const { data: profile } = await supabase.from("profiles").select("tenant_id").single();
    if (!profile) return;
    const existingSteps = steps[stepDialog] || [];
    const { error } = await supabase.from("cadence_steps").insert({
      tenant_id: profile.tenant_id, cadence_id: stepDialog,
      step_number: existingSteps.length + 1,
      type: stepForm.type, delay_days: parseInt(stepForm.delay_days) || 1,
      description: stepForm.description || null,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Passo adicionado!" });
    setStepForm({ type: "email", delay_days: "1", description: "" }); setStepDialog(null); fetchData();
  };

  const deleteStep = async (id: string) => {
    await supabase.from("cadence_steps").delete().eq("id", id);
    toast({ title: "Passo removido!" }); fetchData();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cadências de Vendas</h1>
          <p className="text-muted-foreground">Automatize sequências de follow-up</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Nova Cadência</Button></DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>Nova Cadência</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Ex: Follow-up Pós-Demo" /></div>
              <div className="space-y-2"><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descreva o objetivo da cadência" /></div>
              <Button type="submit" className="w-full">Criar Cadência</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {cadences.length === 0 ? (
        <Card className="border-border bg-card"><CardContent className="py-12 text-center text-muted-foreground">Nenhuma cadência criada. Crie sua primeira cadência de vendas!</CardContent></Card>
      ) : cadences.map((c) => (
        <Card key={c.id} className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base">{c.name}</CardTitle>
                {c.description && <p className="text-xs text-muted-foreground mt-1">{c.description}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={c.is_active} onCheckedChange={() => toggleActive(c.id, c.is_active)} />
              <Badge variant={c.is_active ? "default" : "secondary"}>{c.is_active ? "Ativa" : "Inativa"}</Badge>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteCadence(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(steps[c.id] || []).map((step, i) => (
                <div key={step.id} className="flex items-center gap-3 p-3 rounded-md border border-border">
                  <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary text-xs font-bold">{i + 1}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{stepTypeLabels[step.type] || step.type}</Badge>
                      <span className="text-xs text-muted-foreground">após {step.delay_days} dia(s)</span>
                    </div>
                    {step.description && <p className="text-xs text-muted-foreground mt-1">{step.description}</p>}
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteStep(step.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => { setStepForm({ type: "email", delay_days: "1", description: "" }); setStepDialog(c.id); }}>
                <Plus className="mr-1 h-3 w-3" />Adicionar Passo
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!stepDialog} onOpenChange={(o) => !o && setStepDialog(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Novo Passo</DialogTitle></DialogHeader>
          <form onSubmit={addStep} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={stepForm.type} onValueChange={(v) => setStepForm({ ...stepForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="call">Ligação</SelectItem>
                    <SelectItem value="task">Tarefa</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Delay (dias)</Label><Input type="number" min="0" value={stepForm.delay_days} onChange={(e) => setStepForm({ ...stepForm, delay_days: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Descrição</Label><Textarea value={stepForm.description} onChange={(e) => setStepForm({ ...stepForm, description: e.target.value })} placeholder="O que deve ser feito neste passo?" /></div>
            <Button type="submit" className="w-full">Adicionar Passo</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
