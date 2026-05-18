import { useQuery } from "@tanstack/react-query";
import { Building2, Users, CheckCircle2, XCircle, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type TenantMetric = {
  id: string;
  is_active: boolean;
  suspended_at: string | null;
  deleted_at: string | null;
  user_count: number;
  active_user_count: number;
  created_at: string;
};

export default function AdminMetrics() {
  const { data: tenants, isLoading } = useQuery({
    queryKey: ["admin-metrics-tenants"],
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("v_global_tenant_metrics")
        .select("id, is_active, suspended_at, deleted_at, user_count, active_user_count, created_at");
      if (error) throw error;
      return (data ?? []) as TenantMetric[];
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32" />)}
      </div>
    );
  }

  const list = tenants ?? [];
  const totalTenants = list.length;
  const activeTenants = list.filter(t => t.is_active && !t.suspended_at && !t.deleted_at).length;
  const suspendedTenants = list.filter(t => (!t.is_active || t.suspended_at) && !t.deleted_at).length;
  const deletedTenants = list.filter(t => t.deleted_at).length;
  const totalUsers = list.reduce((sum, t) => sum + (t.user_count ?? 0), 0);
  const activeUsers = list.reduce((sum, t) => sum + (t.active_user_count ?? 0), 0);

  const now = new Date();
  const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const newTenants30d = list.filter(t => new Date(t.created_at) >= last30).length;

  const cards = [
    { label: "Tenants totais", value: totalTenants, icon: Building2, color: "text-primary" },
    { label: "Ativos", value: activeTenants, icon: CheckCircle2, color: "text-green-500" },
    { label: "Suspensos", value: suspendedTenants, icon: XCircle, color: "text-orange-500" },
    { label: "Excluidos", value: deletedTenants, icon: XCircle, color: "text-red-500" },
    { label: "Usuarios totais", value: totalUsers, icon: Users, color: "text-primary" },
    { label: "Usuarios ativos", value: activeUsers, icon: Users, color: "text-green-500" },
    { label: "Novos tenants (30d)", value: newTenants30d, icon: TrendingUp, color: "text-primary" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Metricas globais</h2>
        <p className="text-xs text-muted-foreground">Visao agregada da plataforma AXHUB</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${c.color}`} />
                  {c.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{c.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
