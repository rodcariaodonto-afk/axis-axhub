import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, Bell, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useDocumentExpiryAlerts } from "@/hooks/useDocumentCompliance";

function urgencyConfig(days: number): { label: string; className: string } {
  if (days <= 7)  return { label: `${days}d`, className: "bg-red-500/15 text-red-500 border-red-500/30" };
  if (days <= 15) return { label: `${days}d`, className: "bg-orange-500/15 text-orange-600 border-orange-500/30" };
  return           { label: `${days}d`, className: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30" };
}

export function DocumentExpiryAlerts() {
  const { data: alerts = [], isLoading } = useDocumentExpiryAlerts(30);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          Documentos vencendo nos próximos 30 dias
          {alerts.length > 0 && (
            <Badge variant="outline" className="ml-auto text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
              {alerts.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-3">
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Carregando...
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
            <AlertTriangle className="h-4 w-4 opacity-40" />
            Nenhum documento vencendo nos próximos 30 dias
          </div>
        ) : (
          <div className="divide-y divide-border -mx-2">
            {alerts.map((alert) => {
              const urg = urgencyConfig(alert.daysUntilExpiry);
              return (
                <div key={alert.id} className="flex items-center gap-3 px-2 py-2.5 hover:bg-accent/20 transition-colors">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{alert.pjName ?? "—"}</p>
                    <p className="text-xs text-muted-foreground truncate">{alert.documentTypeName ?? "—"}</p>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <Badge variant="outline" className={cn("text-xs font-mono", urg.className)}>
                      {urg.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(parseISO(alert.expiryDate), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
