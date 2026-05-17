import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2, Users, FileText, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type Tenant = {
  id: string;
  name: string;
  is_active: boolean;
  suspended_at: string | null;
  suspended_reason: string | null;
  deleted_at: string | null;
  plan_name: string | null;
  admin_notes: string | null;
  created_at: string;
};

type TenantProfile = {
  id: string;
  email: string;
  full_name: string | null;
  status: string | null;
  created_at: string;
};

type AuditLog = {
  id: string;
  action: string;
  entity: string | null;
  entity_id: string | null;
  event_type: string | null;
  severity: string | null;
  actor_user_id: string | null;
  created_at: string;
};

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

function StatusBadge({ tenant }: { tenant: Tenant }) {
  if (tenant.deleted_at) return <Badge variant="destructive">Excluido</Badge>;
  if (!tenant.is_active || tenant.suspended_at) return <Badge variant="secondary">Suspenso</Badge>;
  return <Badge className="bg-primary/20 text-primary">Ativo</Badge>;
}

export default function AdminTenantDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: tenant, isLoading: tenantLoading, error: tenantError } = useQuery({
    queryKey: ["admin-tenant", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("tenants")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Tenant;
    },
  });

  const { data: profiles, isLoading: profilesLoading } = useQuery({
    queryKey: ["admin-tenant-profiles", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("id, email, full_name, status, created_at")
        .eq("tenant_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TenantProfile[];
    },
  });

  const { data: audits, isLoading: auditsLoading } = useQuery({
    queryKey: ["admin-tenant-audits", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("audit_logs")
        .select("id, action, entity, entity_id, event_type, severity, actor_user_id, created_at")
        .eq("tenant_id", id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as AuditLog[];
    },
  });

  if (tenantLoading) {
    return <div className="space-y-3"><Skeleton className="h-12 w-1/3" /><Skeleton className="h-40 w-full" /></div>;
  }

  if (tenantError || !tenant) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          Tenant nao encontrado ou sem permissao de acesso.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Link
        to="/admin/tenants"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground w-fit"
      >
        <ArrowLeft className="h-3 w-3" />
        Voltar para lista de tenants
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-md bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">{tenant.name}</CardTitle>
                <p className="text-xs text-muted-foreground font-mono mt-1">{tenant.id}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <StatusBadge tenant={tenant} />
              <Badge variant="outline" className="capitalize">
                Plano: {tenant.plan_name ?? "free"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <div>Criado em {formatDateTime(tenant.created_at)}</div>
          {tenant.suspended_at && (
            <div>Suspenso em {formatDateTime(tenant.suspended_at)} - {tenant.suspended_reason ?? "sem motivo informado"}</div>
          )}
          {tenant.deleted_at && (
            <div>Excluido em {formatDateTime(tenant.deleted_at)}</div>
          )}
          {tenant.admin_notes && (
            <div className="mt-2 pt-2 border-t border-border">
              <strong>Notas:</strong> {tenant.admin_notes}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Usuarios ({profiles?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <FileText className="h-4 w-4" />
            Atividade
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {profilesLoading ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : !profiles || profiles.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Nenhum usuario neste tenant.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Criado em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profiles.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.full_name ?? "-"}</TableCell>
                        <TableCell className="text-sm">{p.email}</TableCell>
                        <TableCell>
                          <Badge variant={p.status === "active" ? "default" : "secondary"} className="capitalize">
                            {p.status ?? "-"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateTime(p.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {auditsLoading ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : !audits || audits.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Nenhuma atividade registrada neste tenant.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quando</TableHead>
                      <TableHead>Acao</TableHead>
                      <TableHead>Entidade</TableHead>
                      <TableHead>Severidade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {audits.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDateTime(a.created_at)}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{a.action}</TableCell>
                        <TableCell className="text-xs">{a.entity ?? "-"}</TableCell>
                        <TableCell>
                          {a.severity && (
                            <Badge variant={a.severity === "error" ? "destructive" : "outline"} className="text-xs">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
