import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Check, CheckCheck, Archive, Trash2, Bell, Filter } from "lucide-react";
import { useNotifications } from "@/components/notifications/NotificationProvider";
import { PRIORITY_COLORS, PRIORITY_LABELS } from "@/components/notifications/notificationTypes";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

export default function Notifications() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, archiveNotification, deleteNotification } = useNotifications();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const navigate = useNavigate();

  const filtered = filter === "unread" ? notifications.filter((n) => !n.is_read) : notifications;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notificações</h1>
          <p className="text-muted-foreground">{unreadCount} não lida{unreadCount !== 1 ? "s" : ""}</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            <CheckCheck className="h-4 w-4 mr-1" /> Marcar todas como lidas
          </Button>
        )}
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList>
          <TabsTrigger value="all">Todas ({notifications.length})</TabsTrigger>
          <TabsTrigger value="unread">Não lidas ({unreadCount})</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>{filter === "unread" ? "Todas as notificações foram lidas" : "Nenhuma notificação"}</p>
          </div>
        ) : (
          filtered.map((n) => (
            <Card
              key={n.id}
              className={`border-border cursor-pointer hover:shadow-sm transition-all ${!n.is_read ? "border-l-4 border-l-primary" : ""}`}
              onClick={() => {
                if (!n.is_read) markAsRead(n.id);
                if (n.action_url) navigate(n.action_url);
              }}
            >
              <CardContent className="p-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className={`font-medium text-sm ${!n.is_read ? "" : "text-muted-foreground"}`}>{n.title}</p>
                    {!n.is_read && <div className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                    <Badge variant={n.priority === "urgent" ? "destructive" : n.priority === "high" ? "default" : "secondary"} className="text-[10px] ml-auto shrink-0">
                      {PRIORITY_LABELS[n.priority] || n.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!n.is_read && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }} title="Marcar como lida">
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); archiveNotification(n.id); }} title="Arquivar">
                    <Archive className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }} title="Excluir">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
