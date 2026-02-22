import { Plus, Wifi, WifiOff, QrCode, AlertCircle, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Session {
  id: string;
  session_name: string;
  status: string;
  phone_number?: string;
}

interface Props {
  sessions: Session[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onNewSession: () => void;
  onConnect: (session: Session) => void;
  onDelete: (id: string) => void;
  onCheckStatus?: (session: Session) => void;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Wifi }> = {
  connected: { label: "Conectado", variant: "default", icon: Wifi },
  qr_pending: { label: "QR Code", variant: "secondary", icon: QrCode },
  disconnected: { label: "Desconectado", variant: "outline", icon: WifiOff },
  error: { label: "Erro", variant: "destructive", icon: AlertCircle },
};

export function WhatsAppSessionList({ sessions, selectedId, onSelect, onNewSession, onConnect, onDelete, onCheckStatus }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <Button onClick={onNewSession} size="sm" className="w-full gap-2">
          <Plus className="h-4 w-4" /> Nova Sessão
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {sessions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma sessão criada</p>
          )}
          {sessions.map((s) => {
            const cfg = statusConfig[s.status] || statusConfig.disconnected;
            const Icon = cfg.icon;
            return (
              <div
                key={s.id}
                onClick={() => onSelect(s.id)}
                className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors group ${
                  selectedId === s.id ? "bg-secondary" : "hover:bg-secondary/50"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.session_name}</p>
                  {s.phone_number && <p className="text-xs text-muted-foreground">{s.phone_number}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant={cfg.variant} className="text-[10px] shrink-0">{cfg.label}</Badge>
                  <div className="hidden group-hover:flex items-center gap-0.5">
                    {onCheckStatus && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => { e.stopPropagation(); onCheckStatus(s); }}
                          >
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Verificar status</TooltipContent>
                      </Tooltip>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Excluir sessão</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
