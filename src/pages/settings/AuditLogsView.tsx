import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Download } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";

const PAGE_SIZE = 50;

const ENTITIES = [
  "all", "company_settings", "user_roles", "api_keys", "product_custom_fields",
  "product_categories", "warehouses", "integrations", "leads", "deals",
  "orders", "customers", "workflows", "notifications", "contacts", "products",
];

function JsonDiff({ label, data }: { label: string; data: unknown }) {
  if (!data) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <div>
      <Badge variant="outline" className="mb-1 text-xs">{label}</Badge>
      <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40 whitespace-pre-wrap">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

export default function AuditLogsView() {
  const [page, setPage] = useState(0);
  const [entityFilter, setEntityFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const { data: tenantId } = useQuery({
    queryKey: ["my-tenant-id"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_user_tenant_id");
      return data as string;
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", tenantId, page, entityFilter, actionFilter],
    enabled: !!tenantId,
    queryFn: async () => {
      let q = supabase
        .from("audit_logs")
        .select("*", { count: "exact" })
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (entityFilter && entityFilter !== "all") q = q.eq("entity", entityFilter);
      if (actionFilter) q = q.ilike("action", `%${actionFilter}%`);

      const { data: rows, count } = await q;
      return { rows: rows || [], count: count || 0 };
    },
  });

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const exportCSV = () => {
    if (!data?.rows.length) return;
    const header = ["Data", "Entidade", "Ação", "Usuário"];
    const rows = data.rows.map((l) => [
      new Date(l.created_at).toLocaleString("pt-BR"),
      l.entity,
      l.action,
      l.actor_user_id?.slice(0, 8) || "—",
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audit_logs.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Logs exportados");
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Logs de Auditoria</CardTitle>
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={!data?.rows.length}>
          <Download className="h-4 w-4 mr-1" /> CSV
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3 flex-wrap">
          <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v); setPage(0); }}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Entidade" /></SelectTrigger>
            <SelectContent>
              {ENTITIES.map((e) => (
                <SelectItem key={e} value={e}>{e === "all" ? "Todas as entidades" : e}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input className="w-48" placeholder="Filtrar ação..." value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(0); }} />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Entidade</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Usuário</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.rows.map((l) => {
              const isExpanded = expandedRows.has(l.id);
              const hasDiff = l.before_json || l.after_json;
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
                      <TableCell className="text-xs">{new Date(l.created_at).toLocaleString("pt-BR")}</TableCell>
                      <TableCell><Badge variant="outline">{l.entity}</Badge></TableCell>
                      <TableCell>{l.action}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{l.actor_user_id?.slice(0, 8) || "—"}</TableCell>
                    </TableRow>
                    <CollapsibleContent asChild>
                      <TableRow>
                        <TableCell colSpan={5} className="bg-muted/30 p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <JsonDiff label="Antes" data={l.before_json} />
                            <JsonDiff label="Depois" data={l.after_json} />
                          </div>
                        </TableCell>
                      </TableRow>
                    </CollapsibleContent>
                  </>
                </Collapsible>
              );
            })}
            {!data?.rows.length && !isLoading && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum log encontrado</TableCell></TableRow>
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{data?.count ?? 0} registros</p>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" disabled={(page + 1) * PAGE_SIZE >= (data?.count ?? 0)} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
