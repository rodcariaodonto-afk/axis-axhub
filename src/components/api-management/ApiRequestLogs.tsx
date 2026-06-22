import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useApiKeys, useApiRequestLogs } from "@/hooks/useApiKeys";
import { useQueryClient } from "@tanstack/react-query";

function fmtDate(d: string) {
  try { return format(parseISO(d), "dd/MM/yy HH:mm:ss", { locale: ptBR }); } catch { return d; }
}

const METHOD_COLORS: Record<string, string> = {
  GET:    "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  POST:   "bg-green-500/15 text-green-600 dark:text-green-400",
  PUT:    "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  PATCH:  "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
  DELETE: "bg-red-500/15 text-red-600 dark:text-red-400",
};

function statusColor(code: number): string {
  if (code < 300) return "bg-green-500/15 text-green-600 dark:text-green-400";
  if (code < 400) return "bg-blue-500/15 text-blue-600 dark:text-blue-400";
  if (code < 500) return "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400";
  return "bg-red-500/15 text-red-600 dark:text-red-400";
}

export function ApiRequestLogs() {
  const { data: keys = [] } = useApiKeys();
  const [selectedKey, setSelectedKey] = useState<string>("all");
  const [pathFilter, setPathFilter] = useState("");
  const { data: logs = [], isLoading } = useApiRequestLogs(
    selectedKey === "all" ? null : selectedKey
  );
  const qc = useQueryClient();

  const filtered = logs.filter((l: any) =>
    !pathFilter || l.path.toLowerCase().includes(pathFilter.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedKey} onValueChange={setSelectedKey}>
          <SelectTrigger className="w-48 h-8 text-sm">
            <SelectValue placeholder="Filtrar por chave" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as chaves</SelectItem>
            {keys.map((k) => (
              <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="Filtrar por path..."
          value={pathFilter}
          onChange={(e) => setPathFilter(e.target.value)}
          className="h-8 text-sm w-56"
        />

        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 ml-auto"
          onClick={() => qc.invalidateQueries({ queryKey: ["api-request-logs"] })}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Atualizar
        </Button>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-16">Método</TableHead>
              <TableHead>Path</TableHead>
              <TableHead className="w-16 text-center">Status</TableHead>
              <TableHead className="w-28 text-center">Tempo (ms)</TableHead>
              <TableHead className="w-32">IP</TableHead>
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
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground text-sm">
                  Nenhum log encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((l: any) => (
                <TableRow key={l.id} className="text-sm hover:bg-muted/20">
                  <TableCell>
                    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold font-mono ${METHOD_COLORS[l.method] ?? "bg-muted text-foreground"}`}>
                      {l.method}
                    </span>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs font-mono">{l.path}</code>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold ${statusColor(l.status_code)}`}>
                      {l.status_code}
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-xs tabular-nums text-muted-foreground">
                    {l.response_time_ms != null ? `${l.response_time_ms} ms` : "—"}
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">
                    {l.ip_address ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {fmtDate(l.created_at)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground text-right">
        Exibindo {filtered.length} de {logs.length} registros (últimos 200)
      </p>
    </div>
  );
}
