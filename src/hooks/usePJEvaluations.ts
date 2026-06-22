import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getUserProfile, getUserTenantId } from "@/lib/getUserTenantId";
import type { PJEvaluationCriteria } from "./usePJEvaluationCriteria";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EvaluationScore {
  criteria_id: string;
  criteria_name: string;
  criteria_weight: number;
  score: number;
}

export interface PJEvaluation {
  id: string;
  tenant_id: string;
  pj_id: string;
  pj_name: string | null;
  evaluator_id: string;
  evaluator_name: string | null;
  period_start: string;
  period_end: string;
  overall_score: number;
  comment: string | null;
  created_at: string;
  scores?: EvaluationScore[];
}

export interface CreateEvaluationInput {
  pj_id: string;
  period_start: string;
  period_end: string;
  comment?: string | null;
  scores: { criteria_id: string; score: number }[];
  criteria: PJEvaluationCriteria[];
}

export interface EvaluationFilters {
  pjId?: string;
  startDate?: string;
  endDate?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function calcWeightedScore(
  scores: { criteria_id: string; score: number }[],
  criteria: PJEvaluationCriteria[]
): number {
  let sumWeightedScores = 0;
  let sumWeights = 0;

  for (const s of scores) {
    const c = criteria.find((cr) => cr.id === s.criteria_id);
    if (!c) continue;
    sumWeightedScores += s.score * c.weight;
    sumWeights += c.weight;
  }

  if (sumWeights === 0) return 0;
  return Math.round((sumWeightedScores / sumWeights) * 100) / 100;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function usePJEvaluations(filters: EvaluationFilters = {}) {
  return useQuery({
    queryKey: ["pj-evaluations", filters],
    staleTime: 2 * 60_000,
    queryFn: async () => {
      let q = (supabase as any)
        .from("pj_evaluations")
        .select(
          "*, crm_accounts(name), profiles(full_name)"
        )
        .order("created_at", { ascending: false });

      if (filters.pjId && filters.pjId !== "todos") q = q.eq("pj_id", filters.pjId);
      if (filters.startDate) q = q.gte("period_start", filters.startDate);
      if (filters.endDate) q = q.lte("period_end", filters.endDate);

      const { data, error } = await q;
      if (error) {
        console.error("[usePJEvaluations]", error);
        return [];
      }
      return ((data ?? []) as any[]).map((r) => ({
        ...r,
        pj_name: (r.crm_accounts as any)?.name ?? null,
        evaluator_name: (r.profiles as any)?.full_name ?? null,
      })) as PJEvaluation[];
    },
  });
}

export function usePJEvaluationDetail(evaluationId: string | null) {
  return useQuery({
    queryKey: ["pj-evaluation-detail", evaluationId],
    enabled: !!evaluationId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data: evalData, error: evalErr } = await (supabase as any)
        .from("pj_evaluations")
        .select("*, crm_accounts(name), profiles(full_name)")
        .eq("id", evaluationId!)
        .single();

      if (evalErr) throw evalErr;

      const { data: scoresData, error: scoresErr } = await (supabase as any)
        .from("pj_evaluation_scores")
        .select("*, pj_evaluation_criteria(name, weight)")
        .eq("evaluation_id", evaluationId!);

      if (scoresErr) throw scoresErr;

      const scores: EvaluationScore[] = ((scoresData ?? []) as any[]).map((s) => ({
        criteria_id: s.criteria_id,
        criteria_name: (s.pj_evaluation_criteria as any)?.name ?? "—",
        criteria_weight: (s.pj_evaluation_criteria as any)?.weight ?? 1,
        score: s.score,
      }));

      return {
        ...evalData,
        pj_name: (evalData.crm_accounts as any)?.name ?? null,
        evaluator_name: (evalData.profiles as any)?.full_name ?? null,
        scores,
      } as PJEvaluation;
    },
  });
}

export function useCreateEvaluation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateEvaluationInput) => {
      const profile = await getUserProfile();
      if (!profile) throw new Error("Usuário não autenticado");

      const overall_score = calcWeightedScore(input.scores, input.criteria);

      // Insert evaluation
      const { data: evaluation, error: evalErr } = await (supabase as any)
        .from("pj_evaluations")
        .insert({
          tenant_id: profile.tenant_id,
          pj_id: input.pj_id,
          evaluator_id: profile.id,
          period_start: input.period_start,
          period_end: input.period_end,
          overall_score,
          comment: input.comment ?? null,
        })
        .select("id")
        .single();

      if (evalErr) throw evalErr;

      // Insert scores for each criterion
      const scoreRows = input.scores.map((s) => ({
        evaluation_id: evaluation.id,
        criteria_id: s.criteria_id,
        score: s.score,
      }));

      const { error: scoresErr } = await (supabase as any)
        .from("pj_evaluation_scores")
        .insert(scoreRows);

      if (scoresErr) throw scoresErr;

      return { id: evaluation.id, overall_score };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pj-evaluations"] });
    },
  });
}

export function useDeleteEvaluation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("pj_evaluations")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pj-evaluations"] });
    },
  });
}
