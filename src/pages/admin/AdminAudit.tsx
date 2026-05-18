import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type AuditRow = {
  id: string;
  tenant_id: string | null;
  actor_user_id: string | null;
  action: string;
  entity: string | null;
  event_type: string | null;
  severity: string | null;
  created_at: string;
  tenants: { id: string; name: string } | null;
};

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  } catch { return "-"; }
}

export default function AdminAudit() {
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  const { data: audits, isLoading } = useQuery({
    queryKey: ["admin-audit-global"],
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("audit_logs")
        .select("id, tenant_id, actor_user_id, action, entity, event_type, severity, created_at, tenants(id, name)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as AuditRow[];
    },
  });

  const filtered = (audits ?? []).filter((a) => {
    if (search) {
      const s = search.toLowerCase();
      const m1 = a.action.toLowerCase().includes(s);
      const m2 = (a.entity ?? "").toLowerCase().includes(s);
      const m3 = (a.tenants?.name ?? "").toLowerCase().includes(s);
      if (!m1 && !m2 && !m3) return false;
    }
    if (severityFilter !== "all" && a.severity !== severityFilter) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Auditoria global</h2>
        <p className="text-xs text-muted-foreground">
          {audits ? `Ultimos ${filtered.length} de ${audits.length} eventos (limite 200)` : "Carregando..."}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar acao, entidade ou tenant..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Severidade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas severidades</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              <FileText className="mx-auto h-8 w-8 mb-2 opacity-50" />
              Nenhum evento encontrado.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Acao</TableHead>
                  <TableHead>Entidade</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Severidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(a.created_at)}</TableCell>
                    <TableCell className="font-mono text-xs">{a.action}</TableCell>
                    <TableCell className="text-xs">{a.entity ?? "-"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.tenants?.name ?? "-"}</TableCell>
                    <TableCell>
                      {a.severity && (
                        <Badge variant={a.severity === "error" ? "destructive" : a.severity === "warning" ? "secondary" : "outline"} className="text-xs capitalize">
                          {a.severity}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
