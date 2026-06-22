import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { RefreshCw, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useWebhooks, useWebhookDeliveryLogs, PJ_EVENTS } from "@/hooks/useWebhookConfig";
import { useQueryClient } from "@tanstack/react-query";

function fmtDate(d: string | null) {
  if (!d) return "—";
  try { return format(parseISO(d), "dd/MM/yy HH:mm:ss", { locale: ptBR }); } catch { return d; }
}

function StatusIcon({ log }: { log: any }) {
  const delivered = log.delivered_at && (!log.response_status || log.response_status < 300);
  if (delivered) return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (log.next_retry_at) return <Clock className="h-4 w-4 text-yellow-500" />;
  return <XCircle className="h-4 w-4 text-red-500" />;
}

function statusLabel(log: any): string {
  if (log.delivered_at && (!log.response_status || log.response_status < 300)) return "Entregue";
  if (log.next_retry_at) return "Aguardando retry";
  return "Falhou";
}

export function WebhookDeliveryLogs() {
  const { data: webhooks = [] } = useWebhooks();
  const [selectedWebhook, setSelectedWebhook] = useState<string>("all");
  const { data: logs = [], isLoading } = useWebhookDeliveryLogs(
    selectedWebhook === "all" ? null : selectedWebhook
  );
  const qc = useQueryClient();

  function eventLabel(ev: string) {
    return PJ_EVENTS.find((e) => e.value === ev)?.label ?? ev;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={selectedWebhook} onValueChange={setSelectedWebhook}>
          <SelectTrigger className="w-64 h-8 text-sm">
            <SelectValue placeholder="Filtrar por webhook" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os webhooks</SelectItem>
            {webhooks.map((wh) => (
              <SelectItem key={wh.id} value={wh.id}>
                {wh.webhook_url.length > 40
                  ? `...${wh.webhook_url.slice(-37)}`
                  : wh.webhook_url}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 ml-auto"
          onClick={() => qc.invalidateQueries({ queryKey: ["webhook-delivery-logs"] })}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Atualizar
        </Button>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-8" />
              <TableHead>Evento</TableHead>
              <TableHead className="w-16 text-center">Tentativa</TableHead>
              <TableHead className="w-20 text-center">HTTP</TableHead>
              <TableHead>Próximo retry</TableHead>
              <TableHead className="w-36">Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Carregando logs...
                  </div>
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground text-sm">
                  Nenhum log de entrega encontrado.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log: any) => (
                <TableRow key={log.id} className="text-sm hover:bg-muted/20">
                  <TableCell className="pl-4">
                    <StatusIcon log={log} />
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className="font-medium">{eventLabel(log.event)}</span>
                      <span className="text-xs text-muted-foreground ml-1.5 font-mono">({log.event})</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{statusLabel(log)}</p>
                  </TableCell>
                  <TableCell className="text-center text-sm font-mono">
                    #{log.attempt}
                  </TableCell>
                  <TableCell className="text-center">
                    {log.response_status ? (
                      <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        log.response_status < 300
                          ? "bg-green-500/15 text-green-600 dark:text-green-400"
                          : "bg-red-500/15 text-red-600 dark:text-red-400"
                      }`}>
                        {log.response_status}
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {fmtDate(log.next_retry_at)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {fmtDate(log.created_at)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground text-right">
        Exibindo {logs.length} registros (últimos 200)
      </p>
    </div>
  );
}
