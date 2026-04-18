import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface MetaConnectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editingConnection?: any;
}

export function MetaConnectionModal({ open, onOpenChange, onSuccess, editingConnection }: MetaConnectionModalProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedData, setSavedData] = useState<any>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (editingConnection) {
      setName(editingConnection.name || "");
      setPhoneNumberId(editingConnection.phone_number_id || "");
      setWabaId(editingConnection.waba_id || "");
      setAccessToken("");
    } else {
      setName(""); setPhoneNumberId(""); setWabaId(""); setAccessToken("");
    }
    setTestStatus("idle"); setTestMessage(""); setSavedData(null);
  }, [editingConnection, open]);

  const handleTest = async () => {
    if (!phoneNumberId || !accessToken) {
      setTestStatus("error");
      setTestMessage("Phone Number ID e Access Token são obrigatórios");
      return;
    }
    setTestStatus("testing");
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-meta-connections", {
        method: "POST",
        body: { _test: true, phone_number_id: phoneNumberId, access_token: accessToken },
      });
      // Testar direto na Graph API
      const res = await fetch(
        `https://graph.facebook.com/v18.0/${phoneNumberId}?fields=display_phone_number&access_token=${accessToken}`
      );
      const json = await res.json();
      if (res.ok) {
        setTestStatus("success");
        setTestMessage(`✅ Conexão válida — Número: ${json.display_phone_number}`);
      } else {
        setTestStatus("error");
        setTestMessage(`❌ ${json.error?.message || "Credenciais inválidas"}`);
      }
    } catch {
      setTestStatus("error");
      setTestMessage("❌ Erro ao testar. Verifique sua conexão.");
    }
  };

  const handleSave = async () => {
    if (!name || !phoneNumberId || !wabaId || !accessToken) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const body = editingConnection
        ? { name, phone_number_id: phoneNumberId, waba_id: wabaId, access_token: accessToken }
        : { name, phone_number_id: phoneNumberId, waba_id: wabaId, access_token: accessToken };

      const { data, error } = await supabase.functions.invoke(
        editingConnection ? `whatsapp-meta-connections/${editingConnection.id}` : "whatsapp-meta-connections",
        { method: editingConnection ? "PUT" : "POST", body }
      );
      if (error) throw error;
      setSavedData(data);
      toast({ title: "Conexão salva com sucesso!" });
      onSuccess();
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-green-500">●</span>
            {editingConnection ? "Editar Conexão Meta" : "WhatsApp Cloud API (Meta)"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Nome da Sessão *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Meta - AXHUB" />
          </div>
          <div className="space-y-1">
            <Label>Phone Number ID *</Label>
            <Input value={phoneNumberId} onChange={(e) => { setPhoneNumberId(e.target.value); setTestStatus("idle"); }} placeholder="1078960131972054" className="font-mono text-sm" />
          </div>
          <div className="space-y-1">
            <Label>WABA ID *</Label>
            <Input value={wabaId} onChange={(e) => setWabaId(e.target.value)} placeholder="146656236182341" className="font-mono text-sm" />
          </div>
          <div className="space-y-1">
            <Label>Access Token *</Label>
            <Input type="password" value={accessToken} onChange={(e) => { setAccessToken(e.target.value); setTestStatus("idle"); }} placeholder={editingConnection ? "Deixe vazio para manter o atual" : "EAAM7DsN9E1s..."} className="font-mono text-sm" />
          </div>

          {testStatus !== "idle" && (
            <div className={`text-sm rounded-md px-3 py-2 ${
              testStatus === "success" ? "bg-green-50 text-green-700 border border-green-200" :
              testStatus === "error" ? "bg-red-50 text-red-700 border border-red-200" :
              "bg-blue-50 text-blue-700 border border-blue-200"
            }`}>
              {testStatus === "testing" ? "⏳ Testando conexão..." : testMessage}
            </div>
          )}

          {savedData && (
            <div className="bg-muted rounded-md p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Configurações do Webhook</p>
              <div className="space-y-1">
                <Label className="text-xs">Webhook URL</Label>
                <div className="flex gap-2">
                  <Input readOnly value={savedData.webhook_url} className="font-mono text-xs" />
                  <Button size="sm" variant="outline" onClick={() => copy(savedData.webhook_url, "url")}>
                    {copied === "url" ? "✅" : "📋"}
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Verify Token</Label>
                <div className="flex gap-2">
                  <Input readOnly value={savedData.webhook_verify_token} className="font-mono text-xs" />
                  <Button size="sm" variant="outline" onClick={() => copy(savedData.webhook_verify_token, "token")}>
                    {copied === "token" ? "✅" : "📋"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="outline" onClick={handleTest} disabled={testStatus === "testing" || !phoneNumberId || !accessToken}>
            {testStatus === "testing" ? "Testando..." : "🔌 Testar"}
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700">
            {saving ? "Salvando..." : "💾 Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
