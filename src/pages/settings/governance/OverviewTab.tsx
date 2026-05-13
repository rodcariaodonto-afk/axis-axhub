import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, AlertTriangle, Clock, FileCheck2, Users, Plug, ScrollText, ShieldAlert } from "lucide-react";

interface Props { onNavigate: (tab: string) => void }

export default function OverviewTab({ onNavigate }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["governance-overview"],
    queryFn: async () => {
      const since30 = new Date(Date.now() - 30 * 86400_000).toISOString();
      const [exp, dsrOpen, delPending, critEvents, integrations, admins, tenant, policy] = await Promise.all([
        supabase.from("data_exports").select("id, created_at, status").order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("data_subject_requests").select("id", { count: "exact", head: true }).neq("status", "resolved"),
        supabase.from("data_deletion_requests").select("id", { count: "exact", head: true }).in("status", ["pending", "approved"]),
        supabase.from("audit_logs").select("id", { count: "exact", head: true }).eq("severity", "critical").gte("created_at", since30),
        supabase.from("integrations").select("id", { count: "exact", head: true }),
        supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "admin"),
        supabase.from("tenants").select("status, cancelled_at, retention_until").eq("id", (await supabase.rpc("get_user_tenant_id")).data ?? "").maybeSingle(),
        supabase.from("data_governance_policies").select("retention_days").maybeSingle(),
      ]);
      return {
        lastExport: exp.data,
        dsrOpen: dsrOpen.count ?? 0,
        delPending: delPending.count ?? 0,
        critEvents: critEvents.count ?? 0,
        integrations: integrations.count ?? 0,
        admins: admins.count ?? 0,
        tenant: tenant.data,
        policy: policy.data,
      };
    },
  });

  if (isLoading) return <div className="text-sm text-muted-foreground py-8">Carregando...</div>;

  const cards = [
    { icon: Download, label: "Última exportação", value: data?.lastExport ? new Date(data.lastExport.created_at).toLocaleString("pt-BR") : "Nenhuma", action: () => onNavigate("exports") },
    { icon: Users, label: "Pedidos de titulares em aberto", value: String(data?.dsrOpen ?? 0), tone: (data?.dsrOpen ?? 0) > 0 ? "warn" : "ok", action: () => onNavigate("dsr") },
    { icon: AlertTriangle, label: "Exclusões pendentes", value: String(data?.delPending ?? 0), tone: (data?.delPending ?? 0) > 0 ? "warn" : "ok", action: () => onNavigate("retention") },
    { icon: ShieldAlert, label: "Eventos críticos (30d)", value: String(data?.critEvents ?? 0), tone: (data?.critEvents ?? 0) > 5 ? "warn" : "ok", action: () => onNavigate("audit") },
    { icon: Clock, label: "Política de retenção", value: data?.policy ? `${data.policy.retention_days} dias` : "Padrão (30d)", action: () => onNavigate("policies") },
    { icon: FileCheck2, label: "Status da conta", value: data?.tenant?.status === "cancelled" ? `Cancelada` : (data?.tenant?.status ?? "Ativa"), tone: data?.tenant?.status === "cancelled" ? "warn" : "ok", action: () => onNavigate("retention") },
    { icon: Plug, label: "Integrações ativas", value: String(data?.integrations ?? 0) },
    { icon: Users, label: "Administradores", value: String(data?.admins ?? 0), tone: (data?.admins ?? 0) > 5 ? "warn" : "ok" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c, i) => (
          <Card key={i} onClick={c.action} className={`p-4 cursor-pointer hover:border-primary/50 transition ${c.tone === "warn" ? "border-amber-500/40" : ""}`}>
            <c.icon className={`h-4 w-4 mb-2 ${c.tone === "warn" ? "text-amber-500" : "text-muted-foreground"}`} />
            <div className="text-xs text-muted-foreground">{c.label}</div>
            <div className="text-lg font-semibold mt-1">{c.value}</div>
          </Card>
        ))}
      </div>
      <Card className="p-4 bg-muted/30">
        <div className="flex items-start gap-3">
          <ScrollText className="h-5 w-5 text-primary mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">Pronto para clientes B2B</p>
            <p className="text-muted-foreground mt-1">Todos os dados estão isolados por conta (multi-tenant), exportações e exclusões são auditadas, e a retenção pós-cancelamento é de 30 dias por padrão.</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => onNavigate("compliance")}>Ver relatório de conformidade</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
