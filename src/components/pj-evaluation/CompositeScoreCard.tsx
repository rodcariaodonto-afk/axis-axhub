import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CompositeScore {
  pj_id: string;
  pj_name?: string | null;
  final_score: number;
  evaluation_score: number;
  compliance_score: number;
  punctuality_score: number;
  rejection_penalty: number;
  calculated_at?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function scoreColor(score: number) {
  if (score >= 70) return { text: "text-green-600 dark:text-green-400", bg: "bg-green-500" };
  if (score >= 40) return { text: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-500" };
  return { text: "text-red-600 dark:text-red-400", bg: "bg-red-500" };
}

function scoreLabel(score: number) {
  if (score >= 70) return "Bom";
  if (score >= 40) return "Regular";
  return "Crítico";
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

interface BarProps {
  label: string;
  value: number;
  weight: string;
  colorClass: string;
  invert?: boolean;
}

function ComponentBar({ label, value, weight, colorClass, invert = false }: BarProps) {
  const displayValue = invert ? value : value;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">{weight}</span>
          <span className={cn("font-mono font-medium tabular-nums", invert && value > 20 ? "text-red-600 dark:text-red-400" : colorClass)}>
            {displayValue.toFixed(0)}
            {invert ? "%" : "%"}
          </span>
        </div>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", invert ? "bg-red-500" : colorClass.replace("text-", "bg-").replace(" dark:text-green-400", "").replace(" dark:text-yellow-400", "").replace(" dark:text-red-400", ""))}
          style={{ width: `${Math.min(100, displayValue)}%` }}
        />
      </div>
    </div>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────

interface Props {
  score: CompositeScore;
  compact?: boolean;
}

export function CompositeScoreCard({ score, compact = false }: Props) {
  const { text: scoreText } = scoreColor(score.final_score);
  const label = scoreLabel(score.final_score);

  const components = [
    { label: "Avaliação",      value: score.evaluation_score,  weight: "×0.4", color: scoreColor(score.evaluation_score).text },
    { label: "Conformidade",   value: score.compliance_score,  weight: "×0.3", color: scoreColor(score.compliance_score).text },
    { label: "Pontualidade",   value: score.punctuality_score, weight: "×0.2", color: scoreColor(score.punctuality_score).text },
    { label: "Penalidade (rejeições)", value: score.rejection_penalty, weight: "×0.1", color: "", invert: true },
  ];

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <span className={cn("text-2xl font-bold tabular-nums", scoreText)}>
          {score.final_score.toFixed(0)}
        </span>
        <div>
          <span className={cn("text-xs font-medium", scoreText)}>{label}</span>
          {score.pj_name && <p className="text-xs text-muted-foreground">{score.pj_name}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-5">
      {/* Score header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          {score.pj_name && (
            <p className="text-xs text-muted-foreground mb-0.5">{score.pj_name}</p>
          )}
          <div className="flex items-end gap-2">
            <span className={cn("text-5xl font-bold tabular-nums leading-none", scoreText)}>
              {score.final_score.toFixed(0)}
            </span>
            <span className="text-sm text-muted-foreground mb-1">/ 100</span>
          </div>
        </div>
        <div className={cn(
          "rounded-full px-3 py-1 text-sm font-semibold",
          score.final_score >= 70
            ? "bg-green-500/15 text-green-700 dark:text-green-400"
            : score.final_score >= 40
            ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400"
            : "bg-red-500/15 text-red-700 dark:text-red-400"
        )}>
          {label}
        </div>
      </div>

      {/* Component bars */}
      <div className="space-y-3">
        {components.map((c) => (
          <ComponentBar
            key={c.label}
            label={c.label}
            value={c.value}
            weight={c.weight}
            colorClass={c.color}
            invert={c.invert}
          />
        ))}
      </div>

      {score.calculated_at && (
        <p className="text-[10px] text-muted-foreground text-right">
          Calculado em {new Date(score.calculated_at).toLocaleString("pt-BR")}
        </p>
      )}
    </div>
  );
}
