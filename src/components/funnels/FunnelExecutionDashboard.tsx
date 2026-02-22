import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Activity, CheckCircle2, XCircle, Clock } from "lucide-react";

interface FunnelExecutionDashboardProps {
  funilId: string;
}

export function FunnelExecutionDashboard({ funilId }: FunnelExecutionDashboardProps) {
  const { data: stats } = useQuery({
    queryKey: ["funnel-exec-stats", funilId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funis_execucoes")
        .select("status")
        .eq("funil_id", funilId);
      if (error) throw error;

      const counts = { em_andamento: 0, concluido: 0, erro: 0, total: data?.length || 0 };
      for (const row of data || []) {
        if (row.status === "em_andamento") counts.em_andamento++;
        else if (row.status === "concluido") counts.concluido++;
        else if (row.status === "erro") counts.erro++;
      }
      return counts;
    },
    refetchInterval: 10000,
  });

  if (!stats || stats.total === 0) return null;

  const items = [
    { label: "Total", value: stats.total, icon: Activity, className: "text-foreground" },
    { label: "Em andamento", value: stats.em_andamento, icon: Clock, className: "text-yellow-400" },
    { label: "Concluídas", value: stats.concluido, icon: CheckCircle2, className: "text-green-400" },
    { label: "Erros", value: stats.erro, icon: XCircle, className: "text-destructive" },
  ];

  return (
    <div className="flex items-center gap-4 px-3 py-1.5 bg-muted/50 rounded-md border border-border">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5 text-xs">
          <item.icon className={`h-3.5 w-3.5 ${item.className}`} />
          <span className="text-muted-foreground">{item.label}:</span>
          <span className={`font-semibold ${item.className}`}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}
