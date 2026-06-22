import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trophy, TrendingDown, BarChart3, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { getUserTenantId } from "@/lib/getUserTenantId";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CompositeScoreCard, scoreColor, type CompositeScore } from "./CompositeScoreCard";
import { usePJProviders } from "@/hooks/useRepasseAdmin";

const THRESHOLD = 40;

// ─── Data hooks ───────────────────────────────────────────────────────────────

function useRanking() {
  return useQuery({
    queryKey: ["pj-ranking"],
    staleTime: 3 * 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pj_composite_scores")
        .select("*, crm_accounts(name)")
        .order("final_score", { ascending: false });

      if (error) {
        console.error("[useRanking]", error);
        return [];
      }
      return ((data ?? []) as any[]).map((r) => ({
        ...r,
        pj_name: (r.crm_accounts as any)?.name ?? null,
      })) as CompositeScore[];
    },
  });
}

// ─── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({ label, value, icon: Icon, colorClass }: {
  label: string; value: string | number; icon: React.ElementType; colorClass: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 flex items-start gap-3">
      <div className={`flex h-9 w-9 items-center justify-center rounded-full ${colorClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-0.5 font-bold text-lg leading-tight truncate">{value}</p>
      </div>
    </div>
  );
}

// ─── Ranking row ──────────────────────────────────────────────────────────────

function RankingRow({ score, position }: { score: CompositeScore; position: number }) {
  const { text } = scoreColor(score.final_score);
  const isCritical = score.final_score < THRESHOLD;

  return (
    <tr className={cn(
      "border-b border-border transition-colors",
      isCritical ? "bg-red-500/5 hover:bg-red-500/10" : "hover:bg-accent/10"
    )}>
      <td className="px-4 py-3 text-sm font-bold text-muted-foreground tabular-nums w-12">
        #{position}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{score.pj_name ?? score.pj_id.slice(0, 8)}</span>
          {isCritical && (
            <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-600 border-red-500/30 gap-1">
              <AlertTriangle className="h-2.5 w-2.5" /> Crítico
            </Badge>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={cn("font-bold tabular-nums text-lg", text)}>
          {score.final_score.toFixed(0)}
        </span>
        <span className="text-xs text-muted-foreground ml-1">/ 100</span>
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
        {score.evaluation_score.toFixed(0)}%
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
        {score.compliance_score.toFixed(0)}%
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
        {score.punctuality_score.toFixed(0)}%
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
        {score.rejection_penalty.toFixed(0)}%
      </td>
    </tr>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PJRankingDashboard() {
  const { data: ranking = [], isLoading } = useRanking();
  const { data: providers = [] } = usePJProviders();
  const queryClient = useQueryClient();
  const [recalculating, setRecalculating] = useState(false);

  // Summary metrics
  const best = ranking[0] ?? null;
  const worst = ranking[ranking.length - 1] ?? null;
  const avg = ranking.length > 0
    ? Math.round(ranking.reduce((s, r) => s + r.final_score, 0) / ranking.length)
    : 0;
  const belowThreshold = ranking.filter((r) => r.final_score < THRESHOLD).length;

  async function handleRecalculateAll() {
    setRecalculating(true);
    const tenantId = await getUserTenantId();
    if (!tenantId) { toast.error("Tenant não encontrado"); setRecalculating(false); return; }

    let success = 0;
    let failed = 0;

    for (const pj of providers) {
      try {
        const { error } = await supabase.functions.invoke("calculate-pj-score", {
          body: { pj_id: pj.id, tenant_id: tenantId },
        });
        if (error) throw error;
        success++;
      } catch {
        failed++;
      }
    }

    await queryClient.invalidateQueries({ queryKey: ["pj-ranking"] });
    setRecalculating(false);

    if (failed === 0) {
      toast.success(`Score recalculado para ${success} PJ${success !== 1 ? "s" : ""}`);
    } else {
      toast.warning(`${success} recalculados, ${failed} com erro`);
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard
          label="Melhor PJ"
          value={best ? `${best.pj_name ?? "—"} (${best.final_score.toFixed(0)})` : "—"}
          icon={Trophy}
          colorClass="bg-green-500/15 text-green-600"
        />
        <SummaryCard
          label="Pior PJ"
          value={worst ? `${worst.pj_name ?? "—"} (${worst.final_score.toFixed(0)})` : "—"}
          icon={TrendingDown}
          colorClass="bg-red-500/15 text-red-600"
        />
        <SummaryCard
          label="Média Geral"
          value={ranking.length > 0 ? `${avg} pts` : "—"}
          icon={BarChart3}
          colorClass="bg-blue-500/15 text-blue-600"
        />
        <SummaryCard
          label={`Abaixo de ${THRESHOLD} pts`}
          value={ranking.length > 0 ? `${belowThreshold} PJ${belowThreshold !== 1 ? "s" : ""}` : "—"}
          icon={AlertTriangle}
          colorClass={belowThreshold > 0 ? "bg-red-500/15 text-red-600" : "bg-muted/40 text-muted-foreground"}
        />
      </div>

      {/* Table header + recalculate button */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">
          {isLoading ? "..." : `${ranking.length} PJ${ranking.length !== 1 ? "s" : ""} ranqueado${ranking.length !== 1 ? "s" : ""}`}
        </h3>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={handleRecalculateAll}
          disabled={recalculating || providers.length === 0}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", recalculating && "animate-spin")} />
          {recalculating ? "Recalculando..." : "Recalcular todos"}
        </Button>
      </div>

      {/* Ranking table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
          Carregando ranking...
        </div>
      ) : ranking.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
          <BarChart3 className="h-8 w-8 opacity-30 mx-auto mb-3" />
          <p className="text-sm">Nenhum score calculado ainda.</p>
          <p className="text-xs mt-1">Clique em "Recalcular todos" para calcular os scores iniciais.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground text-xs">
                <th className="text-left px-4 py-3 font-medium">#</th>
                <th className="text-left px-4 py-3 font-medium">Pessoa Jurídica</th>
                <th className="text-left px-4 py-3 font-medium">Score Final</th>
                <th className="text-left px-4 py-3 font-medium">Avaliação</th>
                <th className="text-left px-4 py-3 font-medium">Conformidade</th>
                <th className="text-left px-4 py-3 font-medium">Pontualidade</th>
                <th className="text-left px-4 py-3 font-medium">Penalidade</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((r, i) => (
                <RankingRow key={r.pj_id} score={r} position={i + 1} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
