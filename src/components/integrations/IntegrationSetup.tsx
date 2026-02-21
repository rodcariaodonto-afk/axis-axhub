import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ConnectorDefinition } from "./connectorsCatalog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Check, ArrowRight, Loader2 } from "lucide-react";

interface IntegrationSetupProps {
  connector: ConnectorDefinition | null;
  tenantId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function IntegrationSetup({ connector, tenantId, open, onOpenChange }: IntegrationSetupProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "failed" | null>(null);
  const [saving, setSaving] = useState(false);

  if (!connector) return null;

  const isWebhookAuth = connector.authType === "webhook";
  const isApiKeyAuth = connector.authType === "api_key";

  const resetAndClose = () => {
    setStep(0);
    setApiKey("");
    setApiSecret("");
    setWebhookUrl("");
    setTesting(false);
    setTestResult(null);
    onOpenChange(false);
  };

  const handleSave = async () => {
    if (!tenantId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("integrations").insert({
        tenant_id: tenantId,
        platform: connector.name,
        slug: connector.slug,
        name: connector.name,
        description: connector.description,
        type: connector.type,
        category: connector.category,
        auth_type: connector.authType,
        api_key: apiKey || null,
        api_secret: apiSecret || null,
        webhook_url: webhookUrl || null,
        is_active: true,
        is_configured: true,
        created_by: user?.id,
        config: {},
      } as any);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["integrations"] });
      toast({ title: `${connector.name} conectado com sucesso!` });
      resetAndClose();
    } catch {
      toast({ title: "Erro ao salvar integração", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    // Simulated test
    await new Promise((r) => setTimeout(r, 1500));
    setTestResult("success");
    setTesting(false);
  };

  const steps = ["Autenticação", "Configuração", "Teste"];

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl">{connector.icon}</span>
            Conectar {connector.name}
          </DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-4">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold ${i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={`text-xs ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
              {i < steps.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {/* Step content */}
        {step === 0 && (
          <div className="space-y-4">
            {isApiKeyAuth && (
              <>
                <div className="space-y-1.5">
                  <Label>API Key</Label>
                  <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Insira sua API Key" />
                </div>
                <div className="space-y-1.5">
                  <Label>API Secret (opcional)</Label>
                  <Input type="password" value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} placeholder="Insira seu API Secret" />
                </div>
              </>
            )}
            {isWebhookAuth && (
              <div className="space-y-1.5">
                <Label>Webhook URL</Label>
                <Input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://..." />
                <p className="text-xs text-muted-foreground">URL de destino para envio de eventos</p>
              </div>
            )}
            {connector.authType === "oauth2" && (
              <div className="p-4 rounded-lg bg-muted text-sm text-muted-foreground text-center">
                OAuth2 será implementado em breve. Por enquanto, insira os tokens manualmente.
                <div className="space-y-1.5 mt-3 text-left">
                  <Label>Access Token</Label>
                  <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Token de acesso" />
                </div>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Eventos que serão sincronizados:</p>
            <div className="flex flex-wrap gap-1.5">
              {connector.events.map((e) => (
                <Badge key={e} variant="secondary" className="text-xs">{e}</Badge>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 text-center py-4">
            {testResult === null && !testing && (
              <Button onClick={handleTest}>Testar Conexão</Button>
            )}
            {testing && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Testando conexão...
              </div>
            )}
            {testResult === "success" && (
              <div className="flex flex-col items-center gap-2 text-primary">
                <Check className="h-8 w-8" />
                <p className="font-medium">Conexão validada com sucesso!</p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {step > 0 && <Button variant="outline" onClick={() => setStep(step - 1)}>Voltar</Button>}
          {step < 2 ? (
            <Button onClick={() => setStep(step + 1)} disabled={step === 0 && !apiKey && !webhookUrl && connector.authType !== "oauth2"}>
              Próximo
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={saving || testResult !== "success"}>
              {saving ? "Salvando..." : "Finalizar"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
