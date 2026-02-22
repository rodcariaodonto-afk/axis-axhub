import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { Settings2 } from "lucide-react";

interface Settings {
  evolution_api_url?: string;
  evolution_api_key?: string;
  auto_reply_enabled?: boolean;
  auto_reply_message?: string;
  max_sessions?: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: Settings;
  onSave: (settings: Settings) => void;
  saving?: boolean;
}

export function WhatsAppSettingsDialog({ open, onOpenChange, settings, onSave, saving }: Props) {
  const [form, setForm] = useState<Settings>(settings);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Configurações Evolution API
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>URL da Evolution API</Label>
            <Input
              value={form.evolution_api_url || ""}
              onChange={(e) => setForm({ ...form, evolution_api_url: e.target.value })}
              placeholder="https://evolution.sua-api.com"
            />
          </div>
          <div className="space-y-2">
            <Label>API Key</Label>
            <Input
              type="password"
              value={form.evolution_api_key || ""}
              onChange={(e) => setForm({ ...form, evolution_api_key: e.target.value })}
              placeholder="Sua chave de API"
            />
          </div>
          <div className="space-y-2">
            <Label>Máximo de sessões</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={form.max_sessions || 3}
              onChange={(e) => setForm({ ...form, max_sessions: parseInt(e.target.value) || 3 })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Resposta automática</Label>
            <Switch
              checked={form.auto_reply_enabled || false}
              onCheckedChange={(v) => setForm({ ...form, auto_reply_enabled: v })}
            />
          </div>
          {form.auto_reply_enabled && (
            <div className="space-y-2">
              <Label>Mensagem automática</Label>
              <Input
                value={form.auto_reply_message || ""}
                onChange={(e) => setForm({ ...form, auto_reply_message: e.target.value })}
                placeholder="Olá! Recebemos sua mensagem..."
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => onSave(form)} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
