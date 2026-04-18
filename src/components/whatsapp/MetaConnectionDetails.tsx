import { useState } from "react";
import { Copy, Check, X, Smartphone } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface MetaConnectionDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: {
    id: string;
    name: string;
    phone_number?: string;
    phone_number_id: string;
    waba_id: string;
    webhook_url: string;
    webhook_verify_token: string;
    status: string;
    created_at: string;
  } | null;
}

export function MetaConnectionDetails({ open, onOpenChange, connection }: MetaConnectionDetailsProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);

  if (!connection) return null;

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      toast({ title: "✅ Copiado para clipboard!" });
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast({ title: "Erro ao copiar", variant: "destructive" });
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-green-500" />
            Detalhes da Conexão
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Nome</p>
              <p className="text-sm font-medium">{connection.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <Badge variant={connection.status === "connected" ? "default" : "outline"} className="text-xs">
                {connection.status === "connected" ? "✅ Conectado" : "⚠️ Desconectado"}
              </Badge>
            </div>
            {connection.phone_number && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Número</p>
                <p className="text-sm font-medium">{connection.phone_number}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Criado em</p>
              <p className="text-sm">{formatDate(connection.created_at)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Phone Number ID</p>
              <p className="text-sm font-mono">{connection.phone_number_id}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">WABA ID</p>
              <p className="text-sm font-mono">{connection.waba_id}</p>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-border">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Webhook URL</p>
              <div className="flex gap-2">
                <code className="flex-1 text-xs bg-muted px-2 py-1.5 rounded break-all">{connection.webhook_url}</code>
                <Button size="sm" variant="outline" className="shrink-0 h-auto" onClick={() => copy(connection.webhook_url, "url")}>
                  {copied === "url" ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Webhook Verify Token</p>
              <div className="flex gap-2">
                <code className="flex-1 text-xs bg-muted px-2 py-1.5 rounded break-all">{connection.webhook_verify_token}</code>
                <Button size="sm" variant="outline" className="shrink-0 h-auto" onClick={() => copy(connection.webhook_verify_token, "token")}>
                  {copied === "token" ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
