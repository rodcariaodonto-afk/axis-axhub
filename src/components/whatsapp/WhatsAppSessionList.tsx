import { Plus, Wifi, WifiOff, QrCode, AlertCircle, Trash2, RefreshCw, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";

interface Session {
  id: string;
  session_name: string;
  status: string;
  phone_number?: string;
  connection_type?: "evolution" | "meta";
}

interface Props {
  sessions: Session[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onNewSession: () => void;
  onNewMetaSession: () => void;
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

export function WhatsAppSessionList({ sessions, selectedId, onSelect, onNewSession, onNewMetaSession, onConnect, onDelete, onCheckStatus }: Props) {
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
              <div
                key={s.id}
                onClick={() => onSelect(s.id)}
                className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors group ${
                  selectedId === s.id ? "bg-secondary" : "hover:bg-secondary/50"
                }`}
              >
                {isMeta
                  ? <Smartphone className="h-4 w-4 shrink-0 text-green-500" />
                  : <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                }
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.session_name}</p>
                  {s.phone_number && <p className="text-xs text-muted-foreground">{s.phone_number}</p>}
                  {isMeta && <p className="text-[10px] text-green-600 font-medium">Meta API</p>}
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant={cfg.variant} className="text-[10px] shrink-0">{cfg.label}</Badge>
                  <div className="hidden group-hover:flex items-center gap-0.5">
                    {onCheckStatus && !isMeta && (
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
