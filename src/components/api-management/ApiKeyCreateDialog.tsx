import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Copy, CheckCircle2, Key } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ALL_SCOPES, ApiKeyScope, useCreateApiKey } from "@/hooks/useApiKeys";

interface Props {
  open: boolean;
  onClose: () => void;
}

const RATE_OPTIONS = [
  { label: "30 req/min", value: 30 },
  { label: "60 req/min (padrão)", value: 60 },
  { label: "120 req/min", value: 120 },
  { label: "300 req/min", value: 300 },
];

export function ApiKeyCreateDialog({ open, onClose }: Props) {
  const create = useCreateApiKey();
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<ApiKeyScope[]>(["pj:read", "nf:read"]);
  const [rateLimit, setRateLimit] = useState(60);
  const [expiresAt, setExpiresAt] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function toggleScope(scope: ApiKeyScope) {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  }

  function handleCopy() {
    if (!generatedKey) return;
    navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    toast({ title: "Chave copiada!" });
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleCreate() {
    if (!name.trim() || scopes.length === 0) return;
    try {
      const key = await create.mutateAsync({
        name: name.trim(),
        scopes,
        rate_limit: rateLimit,
        expires_at: expiresAt || null,
      });
      setGeneratedKey(key);
    } catch {
      // handled in hook
    }
  }

  function handleClose() {
    setName("");
    setScopes(["pj:read", "nf:read"]);
    setRateLimit(60);
    setExpiresAt("");
    setGeneratedKey(null);
    setCopied(false);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            {generatedKey ? "Chave Gerada" : "Nova Chave de API"}
          </DialogTitle>
        </DialogHeader>

        {generatedKey ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
              <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400 mb-1">
                Copie agora — esta chave não será exibida novamente.
              </p>
              <p className="text-xs text-muted-foreground">
                Guarde em local seguro. Trate como senha.
              </p>
            </div>
            <div className="flex gap-2">
              <Input
                value={generatedKey}
                readOnly
                className="font-mono text-xs bg-muted"
              />
              <Button
                variant={copied ? "default" : "outline"}
                size="icon"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Fechar</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label>Nome da chave</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Integração N8N"
              />
            </div>

            <div className="space-y-2">
              <Label>Escopos de acesso</Label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_SCOPES.map((s) => (
                  <label
                    key={s.value}
                    className="flex items-start gap-2.5 rounded-md border border-border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={scopes.includes(s.value)}
                      onCheckedChange={() => toggleScope(s.value)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-tight">{s.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                    </div>
                  </label>
                ))}
              </div>
              {scopes.length === 0 && (
                <p className="text-xs text-destructive">Selecione pelo menos um escopo</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Rate limit</Label>
                <select
                  value={rateLimit}
                  onChange={(e) => setRateLimit(Number(e.target.value))}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                >
                  {RATE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Expiração (opcional)</Label>
                <Input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button
                onClick={handleCreate}
                disabled={!name.trim() || scopes.length === 0 || create.isPending}
              >
                {create.isPending ? "Gerando..." : "Gerar Chave"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
