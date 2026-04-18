import { useState } from "react";
import { Plus, Wifi, WifiOff, QrCode, AlertCircle, Trash2, RefreshCw, Smartphone, Copy, Check, Eye, Pencil, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { MetaConnectionDetails } from "@/components/whatsapp/MetaConnectionDetails";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Session {
  id: string;
  session_name: string;
  status: string;
  phone_number?: string;
  connection_type?: "evolution" | "meta";
  phone_number_id?: string;
  waba_id?: string;
  webhook_url?: string;
  webhook_verify_token?: string;
  created_at?: string;
}

interface Props {
  sessions: Session[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onNewSession: () => void;
  onNewMetaSession: () => void;
  onConnect: (session: Session) => void;
  onDelete: (id: string) => void;
  onEditMeta: (session: Session) => void;
  onCheckStatus?: (session: Session) => void;
  onRefresh: () => void;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Wifi }> = {
  connected: { label: "Conectado", variant: "default", icon: Wifi },
  qr_pending: { label: "QR Code", variant: "secondary", icon: QrCode },
  disconnected: { label: "Desconectado", variant: "outline", icon: WifiOff },
  error: { label: "Erro", variant: "destructive", icon: AlertCircle },
};

export function WhatsAppSessionList({ sessions, selectedId, onSelect, onNewSession, onNewMetaSession, onConnect, onDelete, onEditMeta, onCheckStatus, onRefresh }: Props) {
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);
  const [detailsSession, setDetailsSession] = useState<Session | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Session | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.connection_type === "meta") {
        const { error } = await supabase.from("whatsapp_meta_connections").update({ is_active: false, status: "disconnected" }).eq("id", deleteTarget.id);
        if (error) throw error;
      } else {
        onDelete(deleteTarget.id);
      }
      toast({ title: "✅ Conexão deletada!" });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Erro ao deletar", description: err.message, variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="w-full gap-2">
              <Plus className="h-4 w-4" /> Nova Sessão
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel className="text-xs text-muted-foreground">Escolha o tipo de conexão</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onNewSession} className="gap-2 cursor-pointer">
              <QrCode className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Evolution API</p>
                <p className="text-xs text-muted-foreground">Conexão via QR Code</p>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onNewMetaSession} className="gap-2 cursor-pointer">
              <Smartphone className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm font-medium">WhatsApp Cloud API</p>
                <p className="text-xs text-muted-foreground">API Oficial da Meta</p>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {sessions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma sessão criada</p>
          )}
          {sessions.map((s) => {
            const cfg = statusConfig[s.status] || statusConfig.disconnected;
            const Icon = cfg.icon;
            const isMeta = s.connection_type === "meta";

            return (
              <div key={s.id} className={`rounded-md border transition-colors ${selectedId === s.id ? "bg-secondary border-border" : "border-transparent hover:bg-secondary/50"}`}>
                {/* Linha principal */}
                <div className="flex items-center gap-2 p-2 cursor-pointer" onClick={() => onSelect(s.id)}>
                  {isMeta
                    ? <Smartphone className="h-4 w-4 shrink-0 text-green-500" />
                    : <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.session_name}</p>
                    {s.phone_number && <p className="text-xs text-muted-foreground">{s.phone_number}</p>}
                    {isMeta && <p className="text-[10px] text-green-600 font-medium">Meta API</p>}
                  </div>
                  <Badge variant={cfg.variant} className="text-[10px] shrink-0">{cfg.label}</Badge>
                </div>

                {/* Botões de ação Meta */}
                {isMeta && (
                  <div className="flex items-center gap-0.5 px-2 pb-2 flex-wrap">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setDetailsSession(s); }}>
                          <Eye className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Detalhes</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); copy(s.webhook_url || "", `url-${s.id}`); }}>
                          {copied === `url-${s.id}` ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copiar Webhook URL</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); copy(s.webhook_verify_token || "", `token-${s.id}`); }}>
                          {copied === `token-${s.id}` ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copiar Verify Token</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onEditMeta(s); }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Editar</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteTarget(s); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Deletar</TooltipContent>
                    </Tooltip>
                  </div>
                )}

                {/* Botões Evolution */}
                {!isMeta && (
                  <div className="hidden group-hover:flex items-center gap-0.5 px-2 pb-1">
                    {onCheckStatus && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onCheckStatus(s); }}>
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Verificar status</TooltipContent>
                      </Tooltip>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteTarget(s); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Excluir sessão</TooltipContent>
                    </Tooltip>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Modal Detalhes */}
      <MetaConnectionDetails
        open={!!detailsSession}
        onOpenChange={(open) => { if (!open) setDetailsSession(null); }}
        connection={detailsSession ? {
          id: detailsSession.id,
          name: detailsSession.session_name,
          phone_number: detailsSession.phone_number,
          phone_number_id: detailsSession.phone_number_id || "",
          waba_id: detailsSession.waba_id || "",
          webhook_url: detailsSession.webhook_url || "",
          webhook_verify_token: detailsSession.webhook_verify_token || "",
          status: detailsSession.status,
          created_at: detailsSession.created_at || "",
        } : null}
      />

      {/* Confirmação de deleção */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar conexão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar "{deleteTarget?.session_name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive hover:bg-destructive/90">
              {deleting ? "Deletando..." : "Deletar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
