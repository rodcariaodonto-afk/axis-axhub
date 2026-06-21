import { useQuery } from "@tanstack/react-query";
import { FileText, DollarSign, FolderOpen, Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { usePJSession } from "./PJPortalLayout";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default function PJPortalDashboard() {
  const { tenantId, pjId } = usePJSession();

  // Contratos ativos
  const { data: activeContractsCount = 0, isLoading: loadingContracts } = useQuery({
    queryKey: ["pj-active-contracts", tenantId, pjId],
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("contracts")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("account_id", pjId)
        .eq("is_active", true);
      if (error) return 0;
      return count ?? 0;
    },
  });

  // Próximo vencimento
  const { data: nextExpiry } = useQuery({
    queryKey: ["pj-next-expiry", tenantId, pjId],
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("contracts")
        .select("end_date")
        .eq("tenant_id", tenantId)
        .eq("account_id", pjId)
        .eq("is_active", true)
        .gte("end_date", today)
        .order("end_date", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error || !data) return null;
      return data.end_date as string | null;
    },
  });

  // Último repasse
  const { data: lastRepasse, isLoading: loadingRepasse } = useQuery({
    queryKey: ["pj-last-repasse", tenantId, pjId],
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pj_repasse_history")
        .select("valor, data_repasse, status")
        .eq("tenant_id", tenantId)
        .eq("pj_id", pjId)
        .order("data_repasse", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error || !data) return null;
      return data as { valor: number; data_repasse: string; status: string };
    },
  });

  // Notificações não lidas
  const { data: unreadCount = 0, isLoading: loadingNotif } = useQuery({
    queryKey: ["pj-unread-notif-dashboard", tenantId, pjId],
    staleTime: 60_000,
    queryFn: async () => {
      const { count, error } = await (supabase as any)
        .from("pj_notifications")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("pj_id", pjId)
        .eq("is_read", false);
      if (error) return 0;
      return count ?? 0;
    },
  });

  const cards = [
    {
      title: "Contratos Ativos",
      icon: FileText,
      iconColor: "text-blue-500",
      value: loadingContracts ? "..." : String(activeContractsCount),
      sub: nextExpiry
        ? `Próx. venc.: ${format(new Date(nextExpiry + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}`
        : activeContractsCount > 0 ? "Sem vencimento próximo" : "Nenhum contrato ativo",
    },
    {
      title: "Último Repasse",
      icon: DollarSign,
      iconColor: "text-green-500",
      value: loadingRepasse ? "..." : lastRepasse ? formatCurrency(lastRepasse.valor) : "—",
      sub: lastRepasse
        ? format(new Date(lastRepasse.data_repasse + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })
        : "Nenhum repasse registrado",
    },
    {
      title: "Documentos Pendentes",
      icon: FolderOpen,
      iconColor: "text-yellow-500",
      value: "—",
      sub: "Disponível em breve",
    },
    {
      title: "Notificações",
      icon: Bell,
      iconColor: "text-purple-500",
      value: loadingNotif ? "..." : String(unreadCount),
      sub: unreadCount === 0 ? "Nenhuma não lida" : `${unreadCount} não lida${unreadCount > 1 ? "s" : ""}`,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Resumo do seu portal</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ title, icon: Icon, iconColor, value, sub }) => (
          <Card key={title} className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
              <Icon className={`h-4 w-4 ${iconColor}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{value}</div>
              <p className="text-xs text-muted-foreground mt-1">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
