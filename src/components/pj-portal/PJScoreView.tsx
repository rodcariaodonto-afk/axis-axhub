import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { CompositeScoreCard } from "@/components/pj-evaluation/CompositeScoreCard";
import { usePJSession } from "./PJPortalLayout";

function fmtDate(d: string) {
  try { return format(parseISO(d), "dd/MM/yyyy", { locale: ptBR }); } catch { return d; }
}

const SCORE_LABELS: Record<number, string> = {
  1: "Péssimo", 2: "Ruim", 3: "Regular", 4: "Bom", 5: "Excelente",
};

function StarDisplay({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-3.5 w-3.5 ${n <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/20"}`}
        />
      ))}
    </div>
  );
}

function useOwnCompositeScore(pjId: string | null) {
  return useQuery({
    queryKey: ["own-composite-score", pjId],
    enabled: !!pjId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pj_composite_scores")
        .select("*")
        .eq("pj_id", pjId!)
        .maybeSingle();
      if (error) return null;
      return data ?? null;
    },
  });
}

function useOwnEvaluations(pjId: string | null) {
  return useQuery({
    queryKey: ["own-evaluations", pjId],
    enabled: !!pjId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pj_evaluations")
        .select("id, period_start, period_end, overall_score, comment, created_at, profiles(full_name)")
        .eq("pj_id", pjId!)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) return [];
      return ((data ?? []) as any[]).map((e) => ({
        ...e,
        evaluator_name: (e.profiles as any)?.full_name ?? null,
      }));
    },
  });
}

export default function PJScoreView() {
  const { pjId } = usePJSession();
  const { data: compositeScore, isLoading: scoreLoading } = useOwnCompositeScore(pjId);
  const { data: evaluations = [], isLoading: evalsLoading } = useOwnEvaluations(pjId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Minha Avaliação</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Seu score de desempenho e histórico de avaliações recebidas.
        </p>
      </div>

      {/* Score card */}
      {scoreLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
          Carregando score...
        </div>
      ) : compositeScore ? (
        <CompositeScoreCard score={compositeScore} />
      ) : (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
          <Star className="h-8 w-8 opacity-30 mx-auto mb-3" />
          <p className="text-sm">Nenhum score calculado ainda.</p>
          <p className="text-xs mt-1">
            Seu score será calculado após receber avaliações da clínica.
          </p>
        </div>
      )}

      {/* Evaluation history */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Avaliações Recebidas</h2>

        {evalsLoading ? (
          <div className="py-4 text-sm text-muted-foreground text-center">Carregando...</div>
        ) : evaluations.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
            <p className="text-sm">Nenhuma avaliação recebida ainda.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {evaluations.map((ev: any) => (
              <div key={ev.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">
                      {fmtDate(ev.period_start)} – {fmtDate(ev.period_end)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Avaliado em {fmtDate(ev.created_at)}
                      {ev.evaluator_name ? ` por ${ev.evaluator_name}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-2xl font-bold tabular-nums">
                      {Number(ev.overall_score).toFixed(1)}
                    </p>
                    <p className="text-xs text-muted-foreground">/ 5,0</p>
                  </div>
                </div>

                <StarDisplay value={Math.round(ev.overall_score)} />

                {ev.comment && (
                  <div className="rounded-md bg-muted/30 px-3 py-2">
                    <p className="text-xs text-muted-foreground mb-0.5">Comentário</p>
                    <p className="text-sm">{ev.comment}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
