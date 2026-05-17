import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Building2, Search, ExternalLink, Users, CheckCircle2, XCircle, Trash2 } from "lucide-react";
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

type TenantRow = {
  id: string;
  name: string;
  is_active: boolean;
  suspended_at: string | null;
  suspended_reason: string | null;
  deleted_at: string | null;
  plan_name: string | null;
  created_at: string;
  user_count: number;
  active_user_count: number;
};

type StatusFilter = "all" | "active" | "suspended" | "deleted";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  } catch {
    return "-";
  }
}

function TenantStatusBadge({ tenant }: { tenant: TenantRow }) {
  if (tenant.deleted_at) {
    return <Badge variant="destructive" className="gap-1"><Trash2 className="h-3 w-3" />Excluido</Badge>;
  }
  if (!tenant.is_active || tenant.suspended_at) {
    return <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" />Suspenso</Badge>;
  }
  return <Badge variant="default" className="gap-1 bg-primary/20 text-primary"><CheckCircle2 className="h-3 w-3" />Ativo</Badge>;
}

export default function AdminTenants() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const { data: tenants, isLoading, error } = useQuery({
    queryKey: ["admin-tenants"],
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("v_global_tenant_metrics")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TenantRow[];
    },
  });

  const filtered = (tenants ?? []).filter((t) => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter === "all") return true;
    if (statusFilter === "deleted") return !!t.deleted_at;
    if (statusFilter === "suspended") return !t.deleted_at && (!t.is_active || !!t.suspended_at);
    if (statusFilter === "active") return !t.deleted_at && t.is_active && !t.suspended_at;
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Tenants</h2>
          <p className="text-xs text-muted-foreground">
            {tenants ? `${filtered.length} de ${tenants.length} tenants` : "Carregando..."}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="suspended">Suspensos</SelectItem>
            <SelectItem value="deleted">Excluidos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-sm text-destructive">
              Erro ao carregar tenants: {(error as Error).message}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              <Building2 className="mx-auto h-8 w-8 mb-2 opacity-50" />
              Nenhum tenant encontrado com os filtros aplicados.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead className="text-center">Usuarios</TableHead>
                  <TableHead className="text-center">Ativos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{t.plan_name ?? "free"}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        {t.user_count}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">{t.active_user_count}</TableCell>
                    <TableCell><TenantStatusBadge tenant={t} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(t.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        to={`/admin/tenants/${t.id}`}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        Ver detalhes
                        <ExternalLink className="h-3 w-3" />
                      </Link>
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
