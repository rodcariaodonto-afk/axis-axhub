import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 50;

export default function AuditLogsView() {
  const [page, setPage] = useState(0);
  const [entityFilter, setEntityFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("");

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

  const entities = ["all", "company_settings", "user_roles", "api_keys", "product_custom_fields", "product_categories", "warehouses", "integrations"];

  return (
    <Card className="border-border bg-card">
      <CardHeader><CardTitle>Logs de Auditoria</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3 flex-wrap">
          <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v); setPage(0); }}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Entidade" /></SelectTrigger>
            <SelectContent>
              {entities.map((e) => (
                <SelectItem key={e} value={e}>{e === "all" ? "Todas as entidades" : e}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input className="w-48" placeholder="Filtrar ação..." value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(0); }} />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Entidade</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Usuário</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.rows.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="text-xs">{new Date(l.created_at).toLocaleString("pt-BR")}</TableCell>
                <TableCell>{l.entity}</TableCell>
                <TableCell>{l.action}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{l.actor_user_id?.slice(0, 8) || "—"}</TableCell>
              </TableRow>
            ))}
            {!data?.rows.length && !isLoading && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum log encontrado</TableCell></TableRow>}
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
