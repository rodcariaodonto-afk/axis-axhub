import { useState, useEffect, useMemo } from "react";
import { z } from "zod";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { usePJProviders } from "@/hooks/useRepasseAdmin";
import { useActiveCriteria } from "@/hooks/usePJEvaluationCriteria";
import { useCreateEvaluation, calcWeightedScore } from "@/hooks/usePJEvaluations";

// ─── Score labels ─────────────────────────────────────────────────────────────

const SCORE_LABELS: Record<number, string> = {
  1: "Péssimo",
  2: "Ruim",
  3: "Regular",
  4: "Bom",
  5: "Excelente",
};

// ─── Star Rating ──────────────────────────────────────────────────────────────

interface StarRatingProps {
  value: number;
  onChange: (v: number) => void;
}

function StarRating({ value, onChange }: StarRatingProps) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className="p-0.5 rounded transition-transform hover:scale-110 focus:outline-none"
        >
          <Star
            className={`h-5 w-5 transition-colors ${
              n <= display
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
      {value > 0 && (
        <span className="ml-2 text-xs text-muted-foreground">{SCORE_LABELS[value]}</span>
      )}
    </div>
  );
}

// ─── Score preview badge ──────────────────────────────────────────────────────

function ScorePreview({ score }: { score: number }) {
  const color =
    score >= 4 ? "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30"
    : score >= 3 ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30"
    : score > 0 ? "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30"
    : "bg-muted/50 text-muted-foreground border-border";

  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted/20 px-4 py-3">
      <span className="text-sm text-muted-foreground">Score calculado:</span>
      <Badge variant="outline" className={`text-sm font-bold px-3 py-1 ${color}`}>
        {score > 0 ? score.toFixed(2) : "—"}
      </Badge>
      {score > 0 && (
        <span className="text-xs text-muted-foreground">/ 5,00</span>
      )}
    </div>
  );
}

// ─── Validation schema ────────────────────────────────────────────────────────

const schema = z.object({
  pj_id:        z.string().uuid("Selecione um PJ"),
  period_start: z.string().min(1, "Data início obrigatória"),
  period_end:   z.string().min(1, "Data fim obrigatória"),
  comment:      z.string().optional(),
});

type FormBase = z.infer<typeof schema>;
type FormErrors = Partial<Record<keyof FormBase, string>> & { scores?: string };

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
}

export function EvaluationForm({ open, onClose }: Props) {
  const { data: providers = [] } = usePJProviders();
  const { data: criteria = [] } = useActiveCriteria();
  const createEvaluation = useCreateEvaluation();

  const [form, setForm] = useState<FormBase>({
    pj_id: "",
    period_start: "",
    period_end: "",
    comment: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [scores, setScores] = useState<Record<string, number>>({});

  useEffect(() => {
    if (open) {
      setForm({ pj_id: "", period_start: "", period_end: "", comment: "" });
      setScores({});
      setErrors({});
    }
  }, [open]);

  // Initialize scores to 0 when criteria load
  useEffect(() => {
    const init: Record<string, number> = {};
    criteria.forEach((c) => { init[c.id] = scores[c.id] ?? 0; });
    setScores(init);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criteria.length]);

  function setField<K extends keyof FormBase>(k: K, v: FormBase[K]) {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: undefined }));
  }

  function setScore(criteriaId: string, value: number) {
    setScores((p) => ({ ...p, [criteriaId]: value }));
    setErrors((p) => ({ ...p, scores: undefined }));
  }

  const scoreEntries = useMemo(
    () => criteria.map((c) => ({ criteria_id: c.id, score: scores[c.id] ?? 0 })),
    [criteria, scores]
  );

  const previewScore = useMemo(() => {
    const filled = scoreEntries.filter((s) => s.score > 0);
    if (filled.length === 0) return 0;
    return calcWeightedScore(filled, criteria);
  }, [scoreEntries, criteria]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const baseResult = schema.safeParse(form);
    if (!baseResult.success) {
      const errs: FormErrors = {};
      baseResult.error.errors.forEach((err) => {
        const k = err.path[0] as keyof FormBase;
        if (!errs[k]) errs[k] = err.message;
      });
      setErrors(errs);
      return;
    }

    const filledScores = scoreEntries.filter((s) => s.score > 0);
    if (filledScores.length === 0) {
      setErrors((p) => ({ ...p, scores: "Avalie pelo menos um critério" }));
      return;
    }

    if (baseResult.data.period_end < baseResult.data.period_start) {
      setErrors((p) => ({ ...p, period_end: "Data fim deve ser após a data início" }));
      return;
    }

    try {
      const result = await createEvaluation.mutateAsync({
        pj_id: baseResult.data.pj_id,
        period_start: baseResult.data.period_start,
        period_end: baseResult.data.period_end,
        comment: baseResult.data.comment || null,
        scores: filledScores,
        criteria,
      });
      toast.success(`Avaliação salva — Score: ${result.overall_score.toFixed(2)}`);
      onClose();
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao salvar avaliação");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Avaliação de PJ</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* PJ */}
          <div className="space-y-1.5">
            <Label>Pessoa Jurídica <span className="text-destructive">*</span></Label>
            <Select value={form.pj_id} onValueChange={(v) => setField("pj_id", v)}>
              <SelectTrigger className={errors.pj_id ? "border-destructive" : ""}>
                <SelectValue placeholder="Selecione o PJ a avaliar" />
              </SelectTrigger>
              <SelectContent>
                {providers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}{p.cnpj ? ` — ${p.cnpj}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.pj_id && <p className="text-xs text-destructive">{errors.pj_id}</p>}
          </div>

          {/* Período */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Período — início <span className="text-destructive">*</span></Label>
              <Input
                type="date"
                value={form.period_start}
                onChange={(e) => setField("period_start", e.target.value)}
                className={errors.period_start ? "border-destructive" : ""}
              />
              {errors.period_start && <p className="text-xs text-destructive">{errors.period_start}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Período — fim <span className="text-destructive">*</span></Label>
              <Input
                type="date"
                value={form.period_end}
                onChange={(e) => setField("period_end", e.target.value)}
                className={errors.period_end ? "border-destructive" : ""}
              />
              {errors.period_end && <p className="text-xs text-destructive">{errors.period_end}</p>}
            </div>
          </div>

          {/* Notas por critério */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Avaliação por critério <span className="text-destructive">*</span></Label>
              <span className="text-xs text-muted-foreground">{criteria.length} critério{criteria.length !== 1 ? "s" : ""} ativo{criteria.length !== 1 ? "s" : ""}</span>
            </div>

            {criteria.length === 0 ? (
              <p className="text-sm text-muted-foreground py-3">
                Nenhum critério ativo. Cadastre critérios na aba Critérios antes de avaliar.
              </p>
            ) : (
              <div className="rounded-lg border border-border divide-y divide-border">
                {criteria.map((c) => (
                  <div key={c.id} className="px-4 py-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{c.name}</p>
                        {c.description && (
                          <p className="text-xs text-muted-foreground">{c.description}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">peso {c.weight}</Badge>
                    </div>
                    <StarRating
                      value={scores[c.id] ?? 0}
                      onChange={(v) => setScore(c.id, v)}
                    />
                  </div>
                ))}
              </div>
            )}
            {errors.scores && <p className="text-xs text-destructive">{errors.scores}</p>}
          </div>

          {/* Score preview */}
          <ScorePreview score={previewScore} />

          {/* Comentário */}
          <div className="space-y-1.5">
            <Label>Comentário geral</Label>
            <Textarea
              value={form.comment ?? ""}
              onChange={(e) => setField("comment", e.target.value)}
              placeholder="Observações sobre o desempenho do PJ neste período..."
              rows={3}
              className="resize-none"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={createEvaluation.isPending || criteria.length === 0}>
              {createEvaluation.isPending ? "Salvando..." : "Salvar Avaliação"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
