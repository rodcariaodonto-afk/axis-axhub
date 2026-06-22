import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getUserTenantId } from "@/lib/getUserTenantId";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConciliationStatus = "pendente" | "conciliado" | "divergente";

export interface ConciliationRepasse {
  id: string;
  tenant_id: string;
  pj_id: string;
  pj_name: string | null;
  valor: number;
  data_repasse: string;
  status: string;
  transaction_id: string | null;
  paid_date: string | null;
  paid_amount: number | null;
  conciliation_status: ConciliationStatus;
  comprovante_url: string | null;
  pix_payload: string | null;
  created_at: string;
}

export interface MarkPaidInput {
  id: string;
  transaction_id: string;
  paid_date: string;
  paid_amount: number;
}

export interface ConciliationFilters {
  pjId?: string;
  startDate?: string;
  endDate?: string;
  conciliationStatus?: ConciliationStatus | "todos";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TOLERANCE = 0.01;

export function calcConciliationStatus(paidAmount: number, expectedAmount: number): ConciliationStatus {
  return Math.abs(paidAmount - expectedAmount) <= TOLERANCE ? "conciliado" : "divergente";
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useConciliationRepasses(filters: ConciliationFilters = {}) {
  return useQuery({
    queryKey: ["conciliation-repasses", filters],
    staleTime: 2 * 60_000,
    queryFn: async () => {
      let q = (supabase as any)
        .from("pj_repasse_history")
        .select(
          "id, tenant_id, pj_id, valor, data_repasse, status, transaction_id, paid_date, paid_amount, conciliation_status, comprovante_url, pix_payload, created_at, crm_accounts(name)"
        )
        .order("data_repasse", { ascending: false });

      if (filters.pjId && filters.pjId !== "todos") q = q.eq("pj_id", filters.pjId);
      if (filters.startDate) q = q.gte("data_repasse", filters.startDate);
      if (filters.endDate) q = q.lte("data_repasse", filters.endDate);
      if (filters.conciliationStatus && filters.conciliationStatus !== "todos") {
        q = q.eq("conciliation_status", filters.conciliationStatus);
      }

      const { data, error } = await q;
      if (error) {
        console.error("[useConciliationRepasses]", error);
        return [];
      }
      return ((data ?? []) as any[]).map((r) => ({
        ...r,
        pj_name: (r.crm_accounts as any)?.name ?? null,
        conciliation_status: (r.conciliation_status ?? "pendente") as ConciliationStatus,
      })) as ConciliationRepasse[];
    },
  });
}

export function useMarkRepassePaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: MarkPaidInput) => {
      const conciliation_status = calcConciliationStatus(input.paid_amount, 0);

      // Fetch expected amount first
      const { data: repasse, error: fetchErr } = await (supabase as any)
        .from("pj_repasse_history")
        .select("valor")
        .eq("id", input.id)
        .single();

      if (fetchErr) throw fetchErr;
      const expectedValor = (repasse as any)?.valor ?? 0;

      const status = calcConciliationStatus(input.paid_amount, expectedValor);

      const { error } = await (supabase as any)
        .from("pj_repasse_history")
        .update({
          transaction_id: input.transaction_id,
          paid_date: input.paid_date,
          paid_amount: input.paid_amount,
          conciliation_status: status,
          status: "pago",
        })
        .eq("id", input.id);

      if (error) throw error;
      return status;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conciliation-repasses"] });
      queryClient.invalidateQueries({ queryKey: ["repasses-admin"] });
      queryClient.invalidateQueries({ queryKey: ["pj-repasses"] });
    },
  });
}

export function useConciliationSummary() {
  return useQuery({
    queryKey: ["conciliation-summary"],
    staleTime: 3 * 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pj_repasse_history")
        .select("valor, paid_amount, status, conciliation_status, data_repasse");

      if (error) {
        console.error("[useConciliationSummary]", error);
        return { totalPendente: 0, totalPagoMes: 0, totalConciliado: 0, totalDivergente: 0 };
      }

      const now = new Date();
      const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      let totalPendente = 0;
      let totalPagoMes = 0;
      let totalConciliado = 0;
      let totalDivergente = 0;

      for (const r of (data ?? []) as any[]) {
        if (r.status === "pendente") totalPendente += r.valor ?? 0;
        if (r.status === "pago" && (r.data_repasse ?? "").startsWith(mesAtual)) {
          totalPagoMes += r.paid_amount ?? r.valor ?? 0;
        }
        if (r.conciliation_status === "conciliado") totalConciliado += r.paid_amount ?? r.valor ?? 0;
        if (r.conciliation_status === "divergente") totalDivergente += 1;
      }

      return { totalPendente, totalPagoMes, totalConciliado, totalDivergente };
    },
  });
}
