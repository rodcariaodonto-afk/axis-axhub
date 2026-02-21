import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { format } from "date-fns";

interface IntegrationLogsProps {
  tenantId: string | null;
}

export default function IntegrationLogs({ tenantId }: IntegrationLogsProps) {
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: logs, refetch } = useQuery({
    queryKey: ["integration-logs", tenantId, statusFilter],
    enabled: !!tenantId,
    queryFn: async () => {
      let q = supabase
        .from("integration_logs")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data } = await q;
      return data || [];
    },
  });

  // Auto-refresh every 5s
  useEffect(() => {
    const interval = setInterval(() => refetch(), 5000);
    return () => clearInterval(interval);
  }, [refetch]);

  const statusColor = (s: string) => {
    switch (s) {
      case "success": return "default";
      case "failed": return "destructive";
      default: return "secondary";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filtrar status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="success">Sucesso</SelectItem>
            <SelectItem value="failed">Falha</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">Auto-refresh: 5s</span>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Evento</TableHead>
            <TableHead>Ação</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Duração</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Erro</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs?.map((log: any) => (
            <TableRow key={log.id}>
              <TableCell className="font-mono text-xs">{log.event_type}</TableCell>
              <TableCell><Badge variant="outline" className="text-[10px]">{log.action}</Badge></TableCell>
              <TableCell><Badge variant={statusColor(log.status)} className="text-[10px]">{log.status}</Badge></TableCell>
              <TableCell className="text-xs">{log.duration_ms ? `${log.duration_ms}ms` : "—"}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{format(new Date(log.created_at), "dd/MM HH:mm:ss")}</TableCell>
              <TableCell className="text-xs text-destructive max-w-[200px] truncate">{log.error_message || "—"}</TableCell>
            </TableRow>
          ))}
          {!logs?.length && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">Nenhum log encontrado</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
