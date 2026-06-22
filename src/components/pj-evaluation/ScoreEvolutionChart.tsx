import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { usePJProviders } from "@/hooks/useRepasseAdmin";

interface ScorePoint {
  date: string;
  final_score: number;
  evaluation_score: number;
  compliance_score: number;
  punctuality_score: number;
}

// pj_composite_scores has one row per PJ (UNIQUE tenant_id,pj_id), so evolution
// comes from pj_evaluations.overall_score over time (normalized to 0-100)
function useScoreEvolution(pjId: string | null) {
  return useQuery({
    queryKey: ["score-evolution", pjId],
    enabled: !!pjId,
    staleTime: 3 * 60_000,
    queryFn: async () => {
      // Use evaluation history as time-series proxy (overall_score 0-5 → 0-100)
      const { data, error } = await (supabase as any)
        .from("pj_evaluations")
        .select("created_at, overall_score")
        .eq("pj_id", pjId!)
        .order("created_at", { ascending: true });

      if (error) return [];

      return ((data ?? []) as any[]).map((e) => ({
        date: format(parseISO(e.created_at), "dd/MM/yy", { locale: ptBR }),
        score: Math.round((Number(e.overall_score) / 5) * 100 * 100) / 100,
      }));
    },
  });
}

// ─── Tooltip customizado ──────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const score = payload[0]?.value ?? 0;
  const color = score >= 70 ? "#22c55e" : score >= 40 ? "#eab308" : "#ef4444";
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md text-sm">
      <p className="text-muted-foreground text-xs mb-1">{label}</p>
      <p className="font-bold tabular-nums" style={{ color }}>
        {score.toFixed(1)} pts
      </p>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ScoreEvolutionChart() {
  const [pjId, setPjId] = useState<string>("");
  const { data: providers = [] } = usePJProviders();
  const { data: points = [], isLoading } = useScoreEvolution(pjId || null);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={pjId} onValueChange={setPjId}>
          <SelectTrigger className="w-64 h-8 text-sm">
            <SelectValue placeholder="Selecione um PJ" />
          </SelectTrigger>
          <SelectContent>
            {providers.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          {points.length > 0 ? `${points.length} avaliação${points.length !== 1 ? "ões" : ""}` : ""}
        </span>
      </div>

      <div className="h-64">
        {!pjId ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            Selecione um PJ para ver a evolução do score.
          </div>
        ) : isLoading ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            Carregando...
          </div>
        ) : points.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            Nenhuma avaliação registrada para este PJ.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={70} stroke="#22c55e" strokeDasharray="4 2" strokeWidth={1} label={{ value: "70", fill: "#22c55e", fontSize: 10, position: "right" }} />
              <ReferenceLine y={40} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1} label={{ value: "40", fill: "#ef4444", fontSize: 10, position: "right" }} />
              <Line
                type="monotone"
                dataKey="score"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                dot={{ fill: "hsl(var(--primary))", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
