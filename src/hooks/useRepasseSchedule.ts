import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getUserTenantId } from "@/lib/getUserTenantId";

export type TipoValor = "fixo" | "variavel";
export type Frequencia = "diario" | "semanal" | "quinzenal" | "mensal";
export type ScheduleStatus = "ativo" | "pausado" | "cancelado";

export const FREQUENCIA_LABELS: Record<Frequencia, string> = {
  diario:    "Diário",
  semanal:   "Semanal",
  quinzenal: "Quinzenal",
  mensal:    "Mensal",
};

export interface RepasseSchedule {
  id: string;
  tenant_id: string;
  pj_id: string;
  pj_name: string | null;
  valor: number;
  tipo_valor: TipoValor;
  recorrente: boolean;
  frequencia: Frequencia | null;
  dia_execucao: number | null;
  proxima_data: string;
  bank_account_id: string | null;
  bank_account_name: string | null;
  status: ScheduleStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateScheduleInput {
  pj_id: string;
  valor: number;
  tipo_valor: TipoValor;
  recorrente: boolean;
  frequencia?: Frequencia | null;
  dia_execucao?: number | null;
  proxima_data: string;
  bank_account_id?: string | null;
}

export function useRepasseSchedules() {
  return useQuery({
    queryKey: ["repasse-schedules"],
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pj_repasse_schedules")
        .select("*, crm_accounts(name), bank_accounts(name)")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("[useRepasseSchedules]", error);
        return [];
      }
      return ((data ?? []) as any[]).map((r): RepasseSchedule => ({
        id:               r.id,
        tenant_id:        r.tenant_id,
        pj_id:            r.pj_id,
        pj_name:          (r.crm_accounts as any)?.name ?? null,
        valor:            Number(r.valor),
        tipo_valor:       r.tipo_valor as TipoValor,
        recorrente:       r.recorrente,
        frequencia:       r.frequencia as Frequencia | null,
        dia_execucao:     r.dia_execucao,
        proxima_data:     r.proxima_data,
        bank_account_id:  r.bank_account_id,
        bank_account_name: (r.bank_accounts as any)?.name ?? null,
        status:           r.status as ScheduleStatus,
        created_at:       r.created_at,
        updated_at:       r.updated_at,
      }));
    },
  });
}

export function useCreateRepasseSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateScheduleInput) => {
      const tenantId = await getUserTenantId();
      if (!tenantId) throw new Error("Tenant não encontrado");

      const { error } = await (supabase as any)
        .from("pj_repasse_schedules")
        .insert({
          tenant_id:      tenantId,
          pj_id:          input.pj_id,
          valor:          input.valor,
          tipo_valor:     input.tipo_valor,
          recorrente:     input.recorrente,
          frequencia:     input.recorrente ? (input.frequencia ?? null) : null,
          dia_execucao:   input.recorrente && input.frequencia === "mensal" ? (input.dia_execucao ?? null) : null,
          proxima_data:   input.proxima_data,
          bank_account_id: input.bank_account_id ?? null,
          status:         "ativo",
        });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["repasse-schedules"] }),
  });
}

export function useUpdateRepasseSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<CreateScheduleInput> & { id: string; status?: ScheduleStatus }) => {
      const updates: Record<string, unknown> = { ...patch };
      // Clear frequencia fields if not recorrente
      if (patch.recorrente === false) {
        updates.frequencia = null;
        updates.dia_execucao = null;
      }
      const { error } = await (supabase as any)
        .from("pj_repasse_schedules")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["repasse-schedules"] }),
  });
}

export function useConfirmRepasse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ repasseId, userId }: { repasseId: string; userId: string }) => {
      const { error } = await (supabase as any)
        .from("pj_repasse_history")
        .update({ confirmed_at: new Date().toISOString(), confirmed_by: userId })
        .eq("id", repasseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pj-repasses"] });
      queryClient.invalidateQueries({ queryKey: ["repasses-admin"] });
    },
  });
}

export function useBankAccounts() {
  return useQuery({
    queryKey: ["bank-accounts"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("id, name")
        .order("name");
      if (error) return [];
      return (data ?? []) as { id: string; name: string }[];
    },
  });
}
