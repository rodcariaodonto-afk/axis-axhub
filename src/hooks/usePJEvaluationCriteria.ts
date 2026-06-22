import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getUserTenantId } from "@/lib/getUserTenantId";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PJEvaluationCriteria {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  weight: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SaveCriteriaInput {
  id?: string;
  name: string;
  description?: string | null;
  weight: number;
  is_active: boolean;
}

export const DEFAULT_CRITERIA: Omit<SaveCriteriaInput, "id">[] = [
  { name: "Pontualidade",           description: "Cumprimento de prazos e horários",              weight: 8, is_active: true },
  { name: "Qualidade do Serviço",   description: "Nível técnico e qualidade das entregas",         weight: 10, is_active: true },
  { name: "Documentação",           description: "Conformidade e pontualidade na entrega de docs", weight: 7, is_active: true },
  { name: "Comunicação",            description: "Clareza e proatividade na comunicação",          weight: 6, is_active: true },
  { name: "Custo-Benefício",        description: "Relação entre valor cobrado e valor entregue",   weight: 5, is_active: true },
];

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function usePJEvaluationCriteria() {
  return useQuery({
    queryKey: ["pj-evaluation-criteria"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pj_evaluation_criteria")
        .select("*")
        .order("weight", { ascending: false });
      if (error) {
        console.error("[usePJEvaluationCriteria]", error);
        return [];
      }
      return (data ?? []) as PJEvaluationCriteria[];
    },
  });
}

export function useActiveCriteria() {
  return useQuery({
    queryKey: ["pj-evaluation-criteria-active"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pj_evaluation_criteria")
        .select("*")
        .eq("is_active", true)
        .order("weight", { ascending: false });
      if (error) return [];
      return (data ?? []) as PJEvaluationCriteria[];
    },
  });
}

export function useSaveCriteria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveCriteriaInput) => {
      const tenantId = await getUserTenantId();
      if (!tenantId) throw new Error("Tenant não encontrado");

      const payload = {
        tenant_id: tenantId,
        name: input.name,
        description: input.description ?? null,
        weight: input.weight,
        is_active: input.is_active,
      };

      if (input.id) {
        const { error } = await (supabase as any)
          .from("pj_evaluation_criteria")
          .update(payload)
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("pj_evaluation_criteria")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pj-evaluation-criteria"] });
      queryClient.invalidateQueries({ queryKey: ["pj-evaluation-criteria-active"] });
    },
  });
}

export function useDeleteCriteria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("pj_evaluation_criteria")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pj-evaluation-criteria"] });
      queryClient.invalidateQueries({ queryKey: ["pj-evaluation-criteria-active"] });
    },
  });
}

export function useCreateDefaultCriteria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const tenantId = await getUserTenantId();
      if (!tenantId) throw new Error("Tenant não encontrado");

      const rows = DEFAULT_CRITERIA.map((c) => ({
        tenant_id: tenantId,
        name: c.name,
        description: c.description ?? null,
        weight: c.weight,
        is_active: c.is_active,
      }));

      const { error } = await (supabase as any)
        .from("pj_evaluation_criteria")
        .insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pj-evaluation-criteria"] });
      queryClient.invalidateQueries({ queryKey: ["pj-evaluation-criteria-active"] });
    },
  });
}
