import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface CampaignSettingsProps {
  campaignId: string;
  campaign: { mensagem_template: string; session_id: string | null };
  sessions: { id: string; name: string; status: string }[];
  onUpdate: () => void;
}

export function CampaignSettings({ campaignId, campaign, sessions, onUpdate }: CampaignSettingsProps) {
  const [config, setConfig] = useState({
    delay_minimo_segundos: 2, delay_maximo_segundos: 5, usar_sequencia_aleatoria: true,
    nao_disparar_sabados: false, nao_disparar_domingos: false, nao_disparar_feriados: true,
    hora_inicio_disparo: "08:00", hora_fim_disparo: "20:00",
  });
  const [template, setTemplate] = useState(campaign.mensagem_template);
  const [sessionId, setSessionId] = useState(campaign.session_id || "");
  const { toast } = useToast();

  useEffect(() => {
    supabase.from("campanhas_configuracoes").select("*").eq("campanha_id", campaignId).single().then(({ data }) => {
      if (data) setConfig({
        delay_minimo_segundos: data.delay_minimo_segundos, delay_maximo_segundos: data.delay_maximo_segundos,
        usar_sequencia_aleatoria: data.usar_sequencia_aleatoria,
        nao_disparar_sabados: data.nao_disparar_sabados, nao_disparar_domingos: data.nao_disparar_domingos,
        nao_disparar_feriados: data.nao_disparar_feriados,
        hora_inicio_disparo: data.hora_inicio_disparo, hora_fim_disparo: data.hora_fim_disparo,
      });
    });
  }, [campaignId]);

  const save = async () => {
    await supabase.from("campanhas_configuracoes").update(config).eq("campanha_id", campaignId);
    await supabase.from("campanhas").update({ mensagem_template: template, session_id: sessionId || null }).eq("id", campaignId);
    toast({ title: "Configurações salvas!" }); onUpdate();
  };

  return (
    <div className="space-y-6 mt-4">
      <Card className="border-border bg-card">
        <CardHeader><CardTitle className="text-base">Mensagem & Sessão</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Sessão WhatsApp</Label>
            <Select value={sessionId} onValueChange={setSessionId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{sessions.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} ({s.status})</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Template da Mensagem</Label>
            <Textarea value={template} onChange={(e) => setTemplate(e.target.value)} rows={4} placeholder="Use {nome} para personalizar" />
            <p className="text-xs text-muted-foreground">Variáveis: {"{nome}"} = nome do contato</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader><CardTitle className="text-base">Delay entre Envios</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Delay Mínimo (segundos)</Label><Input type="number" min="1" value={config.delay_minimo_segundos} onChange={(e) => setConfig({ ...config, delay_minimo_segundos: parseInt(e.target.value) || 1 })} /></div>
            <div className="space-y-2"><Label>Delay Máximo (segundos)</Label><Input type="number" min="1" value={config.delay_maximo_segundos} onChange={(e) => setConfig({ ...config, delay_maximo_segundos: parseInt(e.target.value) || 5 })} /></div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={config.usar_sequencia_aleatoria} onCheckedChange={(v) => setConfig({ ...config, usar_sequencia_aleatoria: v })} />
            <Label>Sequência aleatória de contatos</Label>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader><CardTitle className="text-base">Horários de Disparo</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Início</Label><Input type="time" value={config.hora_inicio_disparo} onChange={(e) => setConfig({ ...config, hora_inicio_disparo: e.target.value })} /></div>
            <div className="space-y-2"><Label>Fim</Label><Input type="time" value={config.hora_fim_disparo} onChange={(e) => setConfig({ ...config, hora_fim_disparo: e.target.value })} /></div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2"><Switch checked={config.nao_disparar_sabados} onCheckedChange={(v) => setConfig({ ...config, nao_disparar_sabados: v })} /><Label>Não disparar aos sábados</Label></div>
            <div className="flex items-center gap-2"><Switch checked={config.nao_disparar_domingos} onCheckedChange={(v) => setConfig({ ...config, nao_disparar_domingos: v })} /><Label>Não disparar aos domingos</Label></div>
            <div className="flex items-center gap-2"><Switch checked={config.nao_disparar_feriados} onCheckedChange={(v) => setConfig({ ...config, nao_disparar_feriados: v })} /><Label>Não disparar em feriados</Label></div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} className="w-full">Salvar Configurações</Button>
    </div>
  );
}
