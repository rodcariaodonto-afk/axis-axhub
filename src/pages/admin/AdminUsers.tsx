import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Users as UsersIcon } from "lucide-react";
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

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  status: string | null;
  tenant_id: string | null;
  created_at: string;
  tenants: { id: string; name: string } | null;
};

type RoleRow = {
  user_id: string;
  role: string;
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return "-";
  }
}

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [tenantFilter, setTenantFilter] = useState<string>("all");

  const { data: profiles, isLoading: profilesLoading } = useQuery({
    queryKey: ["admin-users-global"],
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("id, email, full_name, status, tenant_id, created_at, tenants(id, name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProfileRow[];
    },
  });

  const { data: roles } = useQuery({
    queryKey: ["admin-user-roles-global"],
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("user_roles")
        .select("user_id, role");
      if (error) throw error;
      return (data ?? []) as RoleRow[];
    },
  });

  const rolesByUser = new Map<string, string[]>();
  (roles ?? []).forEach((r) => {
    const arr = rolesByUser.get(r.user_id) ?? [];
    arr.push(r.role);
    rolesByUser.set(r.user_id, arr);
  });

  const tenantsList = Array.from(
    new Map(
      (profiles ?? [])
        .filter((p) => p.tenants)
        .map((p) => [p.tenants!.id, p.tenants!])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  const filtered = (profiles ?? []).filter((p) => {
    if (search) {
      const s = search.toLowerCase();
      const matchName = (p.full_name ?? "").toLowerCase().includes(s);
      const matchEmail = (p.email ?? "").toLowerCase().includes(s);
      if (!matchName && !matchEmail) return false;
    }
    if (tenantFilter !== "all" && p.tenant_id !== tenantFilter) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Usuarios (cross-tenant)</h2>
        <p className="text-xs text-muted-foreground">
          {profiles ? `${filtered.length} de ${profiles.length} usuarios` : "Carregando..."}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou e-mail..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={tenantFilter} onValueChange={setTenantFilter}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Filtrar por tenant" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tenants</SelectItem>
            {tenantsList.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {profilesLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (<Skeleton key={i} className="h-10 w-full" />))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              <UsersIcon className="mx-auto h-8 w-8 mb-2 opacity-50" />
              Nenhum usuario encontrado.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const userRoles = rolesByUser.get(p.id) ?? [];
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.full_name ?? "-"}</TableCell>
                      <TableCell className="text-sm">{p.email}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {p.tenants?.name ?? "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {userRoles.length === 0 ? (
                            <span className="text-xs text-muted-foreground">-</span>
                          ) : (
                            userRoles.map((r) => (
                              <Badge key={r} variant="outline" className="text-xs capitalize">{r}</Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.status === "active" ? "default" : "secondary"} className="capitalize">
                          {p.status ?? "-"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(p.created_at)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
