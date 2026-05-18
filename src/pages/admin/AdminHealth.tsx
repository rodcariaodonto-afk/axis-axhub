import { useQuery } from "@tanstack/react-query";
import { Activity, CheckCircle2, AlertCircle, Database, Users, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type HealthCheck = {
  label: string;
  status: "ok" | "warning" | "error";
  detail: string;
  icon: any;
};

export default function AdminHealth() {
  const { data: tenantsCount, isLoading: l1 } = useQuery({
    queryKey: ["health-tenants-count"],
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { count, error } = await (supabase as any).from("tenants").select("*", { count: "exact", head: true });
      if (error) throw error;
      return count as number;
    },
  });

  const { data: profilesCount, isLoading: l2 } = useQuery({
    queryKey: ["health-profiles-count"],
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { count, error } = await (supabase as any).from("profiles").select("*", { count: "exact", head: true });
      if (error) throw error;
      return count as number;
    },
  });

  const { data: auditsCount, isLoading: l3 } = useQuery({
    queryKey: ["health-audits-count"],
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { count, error } = await (supabase as any).from("audit_logs").select("*", { count: "exact", head: true });
      if (error) throw error;
      return count as number;
    },
  });

  const { data: superAdminsCount, isLoading: l4 } = useQuery({
    queryKey: ["health-super-admins-count"],
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { count, error } = await (supabase as any).from("super_admins").select("*", { count: "exact", head: true });
      if (error) throw error;
      return count as number;
    },
  });

  const isLoading = l1 || l2 || l3 || l4;

  const checks: HealthCheck[] = [
    {
      label: "Conexao com banco",
      status: tenantsCount !== undefined ? "ok" : "error",
      detail: tenantsCount !== undefined ? "Banco respondendo normalmente" : "Sem resposta",
      icon: Database,
    },
    {
      label: "Tenants ativos",
      status: "ok",
      detail: `${tenantsCount ?? 0} tenants registrados`,
      icon: Activity,
    },
    {
      label: "Usuarios cadastrados",
      status: "ok",
      detail: `${profilesCount ?? 0} profiles no sistema`,
      icon: Users,
    },
    {
      label: "Audit logs",
      status: (auditsCount ?? 0) > 0 ? "ok" : "warning",
      detail: `${auditsCount ?? 0} registros (esperado > 0)`,
      icon: FileText,
    },
    {
      label: "Super admins",
      status: (superAdminsCount ?? 0) === 1 ? "ok" : (superAdminsCount ?? 0) === 0 ? "error" : "warning",
      detail: `${superAdminsCount ?? 0} super admin(s). Recomendado: 1-2.`,
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Saude do sistema</h2>
        <p className="text-xs text-muted-foreground">Verificacoes basicas de integridade da plataforma</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {checks.map((c) => {
            const Icon = c.icon;
            const statusColor = c.status === "ok" ? "text-green-500" : c.status === "warning" ? "text-orange-500" : "text-red-500";
            const StatusIcon = c.status === "ok" ? CheckCircle2 : AlertCircle;
            return (
              <Card key={c.label}>
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {c.label}
                  </CardTitle>
                  <Badge variant={c.status === "ok" ? "default" : c.status === "warning" ? "secondary" : "destructive"} className="gap-1">
                    <StatusIcon className={`h-3 w-3 ${statusColor}`} />
                    {c.status === "ok" ? "OK" : c.status === "warning" ? "Atencao" : "Erro"}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{c.detail}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
