import { AlertTriangle, DollarSign, FolderOpen, RefreshCw, Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { usePJNotifications } from "@/hooks/usePJNotifications";
import { usePJSession } from "./PJPortalLayout";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const TYPE_CONFIG: Record<string, { icon: React.ElementType; iconClass: string; label: string }> = {
  contrato_vencendo:    { icon: AlertTriangle, iconClass: "text-yellow-500", label: "Contrato vencendo" },
  repasse_realizado:    { icon: DollarSign,    iconClass: "text-green-500",  label: "Repasse realizado" },
  documento_solicitado: { icon: FolderOpen,    iconClass: "text-blue-500",   label: "Documento solicitado" },
  contrato_renovado:    { icon: RefreshCw,     iconClass: "text-purple-500", label: "Contrato renovado" },
};

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] ?? { icon: Bell, iconClass: "text-muted-foreground", label: type };
}

export default function PJNotificationsList() {
  const { tenantId, pjId } = usePJSession();
  const { data: notifications = [], isLoading, markAsRead, markAllAsRead, unreadCount } = usePJNotifications(tenantId, pjId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notificações</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} não lida${unreadCount > 1 ? "s" : ""}` : "Todas lidas"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
          >
            <CheckCheck className="h-4 w-4" />
            Marcar todas como lidas
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mr-3" />
          Carregando notificações...
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <Bell className="h-10 w-10 opacity-30" />
          <p>Nenhuma notificação</p>
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-220px)]">
          <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
            {notifications.map((notif, i) => {
              const cfg = getTypeConfig(notif.type);
              const Icon = cfg.icon;

              return (
                <div
                  key={notif.id}
                  className={cn(
                    "flex items-start gap-4 px-4 py-3.5 transition-colors",
                    !notif.is_read ? "bg-accent/15" : "hover:bg-accent/10"
                  )}
                >
                  <div className={cn("mt-0.5 shrink-0 h-8 w-8 rounded-full flex items-center justify-center", !notif.is_read ? "bg-primary/10" : "bg-muted")}>
                    <Icon className={cn("h-4 w-4", cfg.iconClass)} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("text-sm font-medium", !notif.is_read ? "text-foreground" : "text-muted-foreground")}>
                        {notif.title}
                      </span>
                      {!notif.is_read && (
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                      )}
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 ml-auto shrink-0">
                        {cfg.label}
                      </Badge>
                    </div>
                    {notif.message && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground/70 mt-1">
                      {formatDistanceToNow(parseISO(notif.created_at), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>

                  {!notif.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 h-7 text-xs text-muted-foreground"
                      onClick={() => markAsRead.mutate(notif.id)}
                      disabled={markAsRead.isPending}
                    >
                      Lida
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
