import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Play, Pause, Trash2, Settings, Users, BarChart3, GitBranch, FileText } from "lucide-react";
import { CampaignSettings } from "@/components/campanhas/CampaignSettings";
import { CampaignContactList } from "@/components/campanhas/CampaignContactList";
import { CampaignDashboard } from "@/components/campanhas/CampaignDashboard";

interface Campaign {
  id: string;
  nome: string;
  descricao: string | null;
  status: string;
  mensagem_template: string;
  session_id: string | null;
  funil_id: string | null;
  created_at: string;
}

interface Session {
  id: string;
  name: string;
  status: string;
}

export default function Campanhas() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [form, setForm] = useState({ nome: "", descricao: "", mensagem_template: "", session_id: "", funil_id: "" });
  const [funis, setFunis] = useState<{ id: string; nome: string }[]>([]);
  const [templates, setTemplates] = useState<{ id: string; name: string; body: string }[]>([]);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    const [{ data: c }, { data: s }, { data: f }, { data: t }] = await Promise.all([
      supabase.from("campanhas").select("*").order("created_at", { ascending: false }),
      supabase.from("whatsapp_sessions").select("id, session_name, status"),
      supabase.from("funis").select("id, nome").order("nome"),
      supabase.from("email_templates").select("id, name, body").in("type", ["campanha", "geral"]).order("name"),
    ]);
    setCampaigns(c || []);
    setSessions((s || []).map((x: any) => ({ id: x.id, name: x.session_name, status: x.status })));
    setFunis(f || []);
    setTemplates((t as any[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
    if (!profile) return;
    const { data: campaign, error } = await supabase.from("campanhas").insert({
      tenant_id: profile.tenant_id, nome: form.nome, descricao: form.descricao || null,
      mensagem_template: form.mensagem_template, session_id: form.session_id || null, funil_id: form.funil_id || null,
    }).select().single();
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    // Create default config
    await supabase.from("campanhas_configuracoes").insert({ tenant_id: profile.tenant_id, campanha_id: campaign.id });
    toast({ title: "Campanha criada!" }); setCreateOpen(false); fetchData();
  };

  const startCampaign = async (id: string) => {
    toast({ title: "Iniciando campanha...", description: "Processando contatos em segundo plano." });
    const { data, error } = await supabase.functions.invoke("send-campaign-with-delay", { body: { campanha_id: id } });
    if (error) {
      toast({ title: "Erro ao iniciar", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "Campanha iniciada!",
        description: `${data?.total_contacts || 0} contatos sendo processados em segundo plano.`,
      });
      fetchData();
      // Poll for updates every 10s for 5 minutes
      let polls = 0;
      const interval = setInterval(() => {
        fetchData();
        polls++;
        if (polls >= 30) clearInterval(interval);
      }, 10000);
    }
  };

  const pauseCampaign = async (id: string) => {
    await supabase.from("campanhas").update({ status: "pausada" }).eq("id", id);
    toast({ title: "Campanha pausada." }); fetchData();
  };

  const deleteCampaign = async (id: string) => {
    await supabase.from("campanhas").delete().eq("id", id);
    toast({ title: "Campanha excluída." }); setSelectedCampaign(null); fetchData();
  };

  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    rascunho: { label: "Rascunho", variant: "secondary" },
    ativa: { label: "Ativa", variant: "default" },
    pausada: { label: "Pausada", variant: "outline" },
    concluida: { label: "Concluída", variant: "secondary" },
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  if (selectedCampaign) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setSelectedCampaign(null)}>← Voltar</Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">{selectedCampaign.nome}</h1>
            <p className="text-muted-foreground">{selectedCampaign.descricao || "Sem descrição"}</p>
          </div>
          <Badge variant={statusConfig[selectedCampaign.status]?.variant || "secondary"}>
            {statusConfig[selectedCampaign.status]?.label || selectedCampaign.status}
          </Badge>
          <div className="flex gap-2">
            {selectedCampaign.status === "rascunho" || selectedCampaign.status === "pausada" ? (
              <Button onClick={() => startCampaign(selectedCampaign.id)}><Play className="mr-1 h-4 w-4" />Iniciar</Button>
            ) : selectedCampaign.status === "ativa" ? (
              <Button variant="outline" onClick={() => pauseCampaign(selectedCampaign.id)}><Pause className="mr-1 h-4 w-4" />Pausar</Button>
            ) : null}
            <Button variant="destructive" size="icon" onClick={() => deleteCampaign(selectedCampaign.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>

        <Tabs defaultValue="contatos">
          <TabsList>
            <TabsTrigger value="contatos"><Users className="mr-1 h-4 w-4" />Contatos</TabsTrigger>
            <TabsTrigger value="config"><Settings className="mr-1 h-4 w-4" />Configurações</TabsTrigger>
            <TabsTrigger value="dashboard"><BarChart3 className="mr-1 h-4 w-4" />Dashboard</TabsTrigger>
          </TabsList>
          <TabsContent value="contatos"><CampaignContactList campaignId={selectedCampaign.id} /></TabsContent>
          <TabsContent value="config"><CampaignSettings campaignId={selectedCampaign.id} campaign={selectedCampaign} sessions={sessions} onUpdate={fetchData} /></TabsContent>
          <TabsContent value="dashboard"><CampaignDashboard campaignId={selectedCampaign.id} /></TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Campanhas WhatsApp</h1><p className="text-muted-foreground">Gerencie campanhas de envio em massa</p></div>
        <Button onClick={() => { setForm({ nome: "", descricao: "", mensagem_template: "", session_id: sessions[0]?.id || "", funil_id: "" }); setCreateOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />Nova Campanha
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <Card className="border-border bg-card"><CardContent className="py-12 text-center text-muted-foreground">Nenhuma campanha criada ainda.</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => (
            <Card key={c.id} className="border-border bg-card cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setSelectedCampaign(c)}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base truncate">{c.nome}</CardTitle>
                  <Badge variant={statusConfig[c.status]?.variant || "secondary"}>{statusConfig[c.status]?.label || c.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {c.descricao && <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{c.descricao}</p>}
                <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString("pt-BR")}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Nova Campanha</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2"><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Descrição</Label><Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
            <div className="space-y-2"><Label>Sessão WhatsApp</Label>
              <Select value={form.session_id} onValueChange={(v) => setForm({ ...form, session_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione uma sessão" /></SelectTrigger>
                <SelectContent>{sessions.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} ({s.status})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mensagem Template</Label>
              {templates.length > 0 && (
                <Select onValueChange={(v) => {
                  const tpl = templates.find((t) => t.id === v);
                  if (tpl) setForm({ ...form, mensagem_template: tpl.body });
                }}>
                  <SelectTrigger className="mb-2"><SelectValue placeholder="Usar template salvo..." /></SelectTrigger>
                  <SelectContent>{templates.map((t) => <SelectItem key={t.id} value={t.id}><div className="flex items-center gap-2"><FileText className="h-3 w-3" />{t.name}</div></SelectItem>)}</SelectContent>
                </Select>
              )}
              <Textarea value={form.mensagem_template} onChange={(e) => setForm({ ...form, mensagem_template: e.target.value })} rows={4} placeholder="Use {nome} para personalizar" required />
            </div>
            <div className="space-y-2"><Label>Funil de Venda (opcional)</Label>
              <Select value={form.funil_id} onValueChange={(v) => setForm({ ...form, funil_id: v })}>
                <SelectTrigger><SelectValue placeholder="Nenhum funil vinculado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {funis.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full">Criar Campanha</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
