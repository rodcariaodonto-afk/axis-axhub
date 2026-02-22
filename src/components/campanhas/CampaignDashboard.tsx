import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, CheckCircle, XCircle, Clock, MessageCircle } from "lucide-react";

interface CampaignDashboardProps {
  campaignId: string;
}

export function CampaignDashboard({ campaignId }: CampaignDashboardProps) {
  const [stats, setStats] = useState({ total: 0, pendente: 0, enviado: 0, erro: 0, respondeu: 0 });
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const { data: contacts } = await supabase.from("campanhas_contatos").select("status").eq("campanha_id", campaignId);
      if (contacts) {
        setStats({
          total: contacts.length,
          pendente: contacts.filter((c) => c.status === "pendente").length,
          enviado: contacts.filter((c) => c.status === "enviado").length,
          erro: contacts.filter((c) => c.status === "erro").length,
          respondeu: contacts.filter((c) => c.status === "respondeu").length,
        });
      }
      const { data: hist } = await supabase.from("campanhas_historico_envios").select("*").eq("campanha_id", campaignId).order("created_at", { ascending: false }).limit(50);
      setHistory(hist || []);
    };
    fetchStats();
  }, [campaignId]);

  const cards = [
    { label: "Total", value: stats.total, icon: Send, color: "text-primary" },
    { label: "Pendentes", value: stats.pendente, icon: Clock, color: "text-muted-foreground" },
    { label: "Enviados", value: stats.enviado, icon: CheckCircle, color: "text-green-400" },
    { label: "Erros", value: stats.erro, icon: XCircle, color: "text-destructive" },
    { label: "Responderam", value: stats.respondeu, icon: MessageCircle, color: "text-primary" },
  ];

  return (
    <div className="space-y-6 mt-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className="border-border bg-card">
            <CardContent className="pt-4 pb-3 text-center">
              <c.icon className={`h-5 w-5 mx-auto mb-1 ${c.color}`} />
              <p className="text-2xl font-bold">{c.value}</p>
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border bg-card">
        <CardHeader><CardTitle className="text-base">Histórico de Envios</CardTitle></CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">Nenhum envio registrado ainda.</p>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="flex items-center gap-3 p-2 rounded border border-border text-sm">
                  <span className="font-mono text-xs">{h.contato_telefone}</span>
                  <Badge variant={h.status === "enviado" ? "default" : h.status === "erro" ? "destructive" : "secondary"}>
                    {h.status}
                  </Badge>
                  {h.tempo_espera_segundos > 0 && <span className="text-xs text-muted-foreground">delay: {h.tempo_espera_segundos}s</span>}
                  {h.erro_mensagem && <span className="text-xs text-destructive truncate max-w-48">{h.erro_mensagem}</span>}
                  <span className="text-xs text-muted-foreground ml-auto">{h.enviado_em ? new Date(h.enviado_em).toLocaleString("pt-BR") : ""}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
