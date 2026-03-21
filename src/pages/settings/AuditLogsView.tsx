import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Download, CalendarIcon, FileJson, Search } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;

const ENTITIES = [
  "all", "company_settings", "user_roles", "api_keys", "product_custom_fields",
  "product_categories", "warehouses", "integrations", "leads", "deals",
  "orders", "customers", "workflows", "notifications", "contacts", "products",
  "contracts", "bank_accounts", "bank_transfers", "whatsapp", "auth",
];

const ACTIONS = ["all", "CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT"];

const actionColors: Record<string, string> = {
  CREATE: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  UPDATE: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  DELETE: "bg-red-500/20 text-red-400 border-red-500/30",
  LOGIN: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  LOGOUT: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

function getActionColor(action: string) {
  const upper = action.toUpperCase();
  for (const key of Object.keys(actionColors)) {
    if (upper.includes(key)) return actionColors[key];
  }
  return "bg-muted text-muted-foreground";
}

interface DiffResult {
  key: string;
  type: "added" | "removed" | "modified" | "unchanged";
  before?: unknown;
  after?: unknown;
}

function computeDiff(before: Record<string, unknown> | null, after: Record<string, unknown> | null): DiffResult[] {
  const results: DiffResult[] = [];
  const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);

  for (const key of allKeys) {
    const b = before?.[key];
    const a = after?.[key];
    if (b === undefined && a !== undefined) {
      results.push({ key, type: "added", after: a });
    } else if (b !== undefined && a === undefined) {
      results.push({ key, type: "removed", before: b });
    } else if (JSON.stringify(b) !== JSON.stringify(a)) {
      results.push({ key, type: "modified", before: b, after: a });
    }
  }
  return results;
}

function DiffView({ before, after }: { before: unknown; after: unknown }) {
  const b = (typeof before === "object" && before !== null && !Array.isArray(before)) ? before as Record<string, unknown> : null;
  const a = (typeof after === "object" && after !== null && !Array.isArray(after)) ? after as Record<string, unknown> : null;

  if (!b && !a) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Badge variant="outline" className="mb-1 text-xs">Antes</Badge>
          <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40 whitespace-pre-wrap">
            {before ? JSON.stringify(before, null, 2) : "—"}
          </pre>
        </div>
        <div>
          <Badge variant="outline" className="mb-1 text-xs">Depois</Badge>
          <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40 whitespace-pre-wrap">
            {after ? JSON.stringify(after, null, 2) : "—"}
          </pre>
        </div>
      </div>
    );
  }

  const diffs = computeDiff(b, a);
  if (diffs.length === 0) {
    return <p className="text-xs text-muted-foreground">Nenhuma alteração detectada</p>;
  }

  return (
    <div className="space-y-1 max-h-60 overflow-auto">
      {diffs.map((d) => (
        <div key={d.key} className={cn(
          "flex items-start gap-2 text-xs p-1.5 rounded font-mono",
          d.type === "added" && "bg-emerald-500/10 text-emerald-400",
          d.type === "removed" && "bg-red-500/10 text-red-400",
          d.type === "modified" && "bg-amber-500/10 text-amber-400",
        )}>
          <span className="font-semibold min-w-[120px] shrink-0">{d.key}:</span>
          {d.type === "added" && <span>+ {JSON.stringify(d.after)}</span>}
          {d.type === "removed" && <span>- {JSON.stringify(d.before)}</span>}
          {d.type === "modified" && (
            <span>
              <span className="line-through opacity-60">{JSON.stringify(d.before)}</span>
              {" → "}
              <span>{JSON.stringify(d.after)}</span>
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function AuditLogsView() {
  const [page, setPage] = useState(0);
  const [entityFilter, setEntityFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [searchText, setSearchText] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const { data: tenantId } = useQuery({
    queryKey: ["my-tenant-id"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_user_tenant_id");
      return data as string;
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["tenant-profiles", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("tenant_id", tenantId!);
      return data || [];
    },
  });

  const profileMap = useMemo(() => {
    const map: Record<string, string> = {};
    profiles?.forEach((p) => {
      map[p.id] = p.full_name || p.email || p.id.slice(0, 8);
    });
    return map;
  }, [profiles]);

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", tenantId, page, entityFilter, actionFilter, userFilter, dateFrom?.toISOString(), dateTo?.toISOString(), searchText],
    enabled: !!tenantId,
    queryFn: async () => {
      let q = supabase
        .from("audit_logs")
        .select("*", { count: "exact" })
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (entityFilter && entityFilter !== "all") q = q.eq("entity", entityFilter);
      if (actionFilter && actionFilter !== "all") q = q.ilike("action", `%${actionFilter}%`);
      if (userFilter && userFilter !== "all") q = q.eq("actor_user_id", userFilter);
      if (dateFrom) q = q.gte("created_at", dateFrom.toISOString());
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        q = q.lte("created_at", end.toISOString());
      }
      if (searchText) q = q.or(`action.ilike.%${searchText}%,entity.ilike.%${searchText}%`);

      const { data: rows, count } = await q;
      return { rows: rows || [], count: count || 0 };
    },
  });

  const stats = useMemo(() => {
    if (!data?.rows) return { total: 0, byAction: {} as Record<string, number> };
    const byAction: Record<string, number> = {};
    data.rows.forEach((r) => {
      const a = r.action?.toUpperCase().split("_")[0] || "OTHER";
      byAction[a] = (byAction[a] || 0) + 1;
    });
    return { total: data.count, byAction };
  }, [data]);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const resetFilters = () => {
    setEntityFilter("all");
    setActionFilter("all");
    setUserFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
    setSearchText("");
    setPage(0);
  };

  const exportCSV = () => {
    if (!data?.rows.length) return;
    const header = ["Data", "Usuário", "Entidade", "Ação", "Entity ID", "IP", "User Agent", "Antes", "Depois"];
    const rows = data.rows.map((l) => [
      new Date(l.created_at).toLocaleString("pt-BR"),
      profileMap[l.actor_user_id || ""] || l.actor_user_id || "—",
      l.entity,
      l.action,
      l.entity_id || "",
      (l as any).ip_address || "",
      (l as any).user_agent || "",
      l.before_json ? JSON.stringify(l.before_json) : "",
      l.after_json ? JSON.stringify(l.after_json) : "",
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit_logs_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Logs exportados em CSV");
  };

  const exportJSON = () => {
    if (!data?.rows.length) return;
    const enriched = data.rows.map((l) => ({
      ...l,
      actor_name: profileMap[l.actor_user_id || ""] || null,
    }));
    const blob = new Blob([JSON.stringify(enriched, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit_logs_${format(new Date(), "yyyy-MM-dd")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Logs exportados em JSON");
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
        <CardTitle>Logs de Auditoria</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={!data?.rows.length}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportJSON} disabled={!data?.rows.length}>
            <FileJson className="h-4 w-4 mr-1" /> JSON
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="flex gap-3 flex-wrap items-center">
          <Badge variant="secondary" className="text-sm">{stats.total} registros</Badge>
          {Object.entries(stats.byAction).map(([action, count]) => (
            <Badge key={action} className={cn("text-xs", getActionColor(action))}>
              {action}: {count}
            </Badge>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap items-end">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Entidade</label>
            <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v); setPage(0); }}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ENTITIES.map((e) => (
                  <SelectItem key={e} value={e}>{e === "all" ? "Todas" : e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Ação</label>
            <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTIONS.map((a) => (
                  <SelectItem key={a} value={a}>{a === "all" ? "Todas" : a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Usuário</label>
            <Select value={userFilter} onValueChange={(v) => { setUserFilter(v); setPage(0); }}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {profiles?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">De</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-36 justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                  <CalendarIcon className="mr-1 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Início"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFrom} onSelect={(d) => { setDateFrom(d); setPage(0); }} className="pointer-events-auto" locale={ptBR} />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Até</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-36 justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                  <CalendarIcon className="mr-1 h-4 w-4" />
                  {dateTo ? format(dateTo, "dd/MM/yyyy") : "Fim"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateTo} onSelect={(d) => { setDateTo(d); setPage(0); }} className="pointer-events-auto" locale={ptBR} />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Buscar</label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="w-44 pl-8" placeholder="Buscar..." value={searchText} onChange={(e) => { setSearchText(e.target.value); setPage(0); }} />
            </div>
          </div>

          <Button variant="ghost" size="sm" onClick={resetFilters} className="text-xs">Limpar</Button>
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Entidade</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.rows.map((l) => {
              const isExpanded = expandedRows.has(l.id);
              const hasDiff = l.before_json || l.after_json;
              const userName = profileMap[l.actor_user_id || ""] || "Sistema";
              return (
                <Collapsible key={l.id} asChild open={isExpanded} onOpenChange={() => toggleRow(l.id)}>
                  <>
                    <TableRow className={hasDiff ? "cursor-pointer hover:bg-muted/50" : ""}>
                      <TableCell className="p-1">
                        {hasDiff && (
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </Button>
                          </CollapsibleTrigger>
                        )}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {new Date(l.created_at).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-sm">{userName}</TableCell>
                      <TableCell><Badge variant="outline">{l.entity}</Badge></TableCell>
                      <TableCell>
                        <Badge className={cn("text-xs", getActionColor(l.action))}>{l.action}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {l.entity_id ? `ID: ${l.entity_id.slice(0, 8)}...` : "—"}
                      </TableCell>
                    </TableRow>
                    {hasDiff && (
                      <CollapsibleContent asChild>
                        <TableRow>
                          <TableCell colSpan={6} className="bg-muted/30 p-4">
                            <DiffView before={l.before_json} after={l.after_json} />
                          </TableCell>
                        </TableRow>
                      </CollapsibleContent>
                    )}
                  </>
                </Collapsible>
              );
            })}
            {!data?.rows.length && !isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Nenhum log encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {page + 1} de {Math.max(1, Math.ceil((data?.count ?? 0) / PAGE_SIZE))} — {data?.count ?? 0} registros
          </p>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" disabled={page === 0} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" disabled={(page + 1) * PAGE_SIZE >= (data?.count ?? 0)} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
