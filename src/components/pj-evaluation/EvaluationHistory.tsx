import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronDown, ChevronRight, Star, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  usePJEvaluations, usePJEvaluationDetail, useDeleteEvaluation,
  type PJEvaluation, type EvaluationFilters,
} from "@/hooks/usePJEvaluations";
import { usePJProviders } from "@/hooks/useRepasseAdmin";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SCORE_LABELS: Record<number, string> = {
  1: "Péssimo", 2: "Ruim", 3: "Regular", 4: "Bom", 5: "Excelente",
};

function fmtDate(d: string) {
  try { return format(parseISO(d), "dd/MM/yyyy", { locale: ptBR }); } catch { return d; }
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 4 ? "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30"
    : score >= 3 ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30"
    : "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30";
  return (
    <Badge variant="outline" className={`font-bold tabular-nums ${color}`}>
      {score.toFixed(2)}
    </Badge>
  );
}

function StarDisplay({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-3.5 w-3.5 ${n <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/20"}`}
        />
      ))}
      <span className="ml-1.5 text-xs text-muted-foreground">{SCORE_LABELS[value] ?? value}</span>
    </div>
  );
}

// ─── Expandable detail row ────────────────────────────────────────────────────

function EvaluationDetailPanel({ evaluationId }: { evaluationId: string }) {
  const { data, isLoading } = usePJEvaluationDetail(evaluationId);

  if (isLoading) {
    return (
      <div className="px-6 py-4 text-sm text-muted-foreground">
        Carregando detalhes...
      </div>
    );
  }

  if (!data?.scores?.length) {
    return (
      <div className="px-6 py-4 text-sm text-muted-foreground">
        Nenhum detalhe disponível.
      </div>
    );
  }

  return (
    <div className="px-6 py-4 space-y-3 bg-muted/20">
      <div className="grid gap-2">
        {data.scores.map((s) => (
          <div key={s.criteria_id} className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <span className="text-sm font-medium">{s.criteria_name}</span>
              <span className="ml-2 text-xs text-muted-foreground">(peso {s.criteria_weight})</span>
            </div>
            <StarDisplay value={s.score} />
          </div>
        ))}
      </div>
      {data.comment && (
        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground mb-1">Comentário</p>
          <p className="text-sm">{data.comment}</p>
        </div>
      )}
    </div>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

interface RowProps {
  evaluation: PJEvaluation;
  onDelete: (e: PJEvaluation) => void;
}

function EvaluationRow({ evaluation: ev, onDelete }: RowProps) {
  const [expanded, setExpanded] = useState(false);
  const ChevronIcon = expanded ? ChevronDown : ChevronRight;

  return (
    <>
      <tr className="border-b border-border hover:bg-accent/10 transition-colors">
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
          >
            <ChevronIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            {ev.pj_name ?? "—"}
          </button>
        </td>
        <td className="px-4 py-3 text-xs text-muted-foreground">
          {fmtDate(ev.period_start)} – {fmtDate(ev.period_end)}
        </td>
        <td className="px-4 py-3">
          <ScoreBadge score={ev.overall_score} />
        </td>
        <td className="px-4 py-3 text-xs text-muted-foreground">
          {ev.evaluator_name ?? "—"}
        </td>
        <td className="px-4 py-3 text-xs text-muted-foreground">
          {fmtDate(ev.created_at)}
        </td>
        <td className="px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive h-7 w-7 p-0"
            onClick={() => onDelete(ev)}
            title="Remover"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-border">
          <td colSpan={6} className="p-0">
            <EvaluationDetailPanel evaluationId={ev.id} />
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EvaluationHistory() {
  const [filters, setFilters] = useState<EvaluationFilters>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [deleting, setDeleting] = useState<PJEvaluation | null>(null);

  const { data: providers = [] } = usePJProviders();
  const { data: evaluations = [], isLoading } = usePJEvaluations(filters);
  const deleteMutation = useDeleteEvaluation();

  function setFilter<K extends keyof EvaluationFilters>(k: K, v: EvaluationFilters[K]) {
    setFilters((prev) => ({ ...prev, [k]: v }));
  }

  const hasActiveFilters = !!(filters.pjId || filters.startDate || filters.endDate);

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteMutation.mutateAsync(deleting.id);
      toast.success("Avaliação removida");
      setDeleting(null);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao remover");
    }
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={filtersOpen ? "default" : "outline"}
          className="h-8 gap-1.5"
          onClick={() => setFiltersOpen((v) => !v)}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filtros
          {hasActiveFilters && (
            <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">!</span>
          )}
        </Button>
        {hasActiveFilters && (
          <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground" onClick={() => setFilters({})}>
            Limpar
          </Button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {isLoading ? "..." : `${evaluations.length} avaliação${evaluations.length !== 1 ? "ões" : ""}`}
        </span>
      </div>

      {filtersOpen && (
        <div className="flex flex-wrap gap-3 rounded-lg border border-border bg-muted/30 p-3">
          <Select value={filters.pjId ?? "todos"} onValueChange={(v) => setFilter("pjId", v === "todos" ? undefined : v)}>
            <SelectTrigger className="h-8 text-sm w-52">
              <SelectValue placeholder="Filtrar por PJ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os PJ</SelectItem>
              {providers.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground shrink-0">Período de</span>
            <Input
              type="date"
              className="h-8 text-sm w-36"
              value={filters.startDate ?? ""}
              onChange={(e) => setFilter("startDate", e.target.value || undefined)}
            />
            <span className="text-xs text-muted-foreground shrink-0">até</span>
            <Input
              type="date"
              className="h-8 text-sm w-36"
              value={filters.endDate ?? ""}
              onChange={(e) => setFilter("endDate", e.target.value || undefined)}
            />
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
          Carregando...
        </div>
      ) : evaluations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
          <Search className="h-8 w-8 opacity-30" />
          <p className="text-sm">Nenhuma avaliação encontrada</p>
        </div>
      ) : (
        <div className={cn("rounded-lg border border-border overflow-hidden")}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground text-xs">
                <th className="text-left px-4 py-3 font-medium">PJ Avaliado</th>
                <th className="text-left px-4 py-3 font-medium">Período</th>
                <th className="text-left px-4 py-3 font-medium">Score</th>
                <th className="text-left px-4 py-3 font-medium">Avaliador</th>
                <th className="text-left px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {evaluations.map((ev) => (
                <EvaluationRow key={ev.id} evaluation={ev} onDelete={setDeleting} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => { if (!o) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover avaliação?</AlertDialogTitle>
            <AlertDialogDescription>
              A avaliação de <strong>{deleting?.pj_name}</strong> para o período{" "}
              {deleting ? `${fmtDate(deleting.period_start)} – ${fmtDate(deleting.period_end)}` : ""} será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
