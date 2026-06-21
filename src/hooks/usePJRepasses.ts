import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PJRepasse {
  id: string;
  valor: number;
  data_repasse: string;
  status: string;
  comprovante_url: string | null;
  payable_id: string | null;
  contract_id: string | null;
  schedule_id: string | null;
  confirmed_at: string | null;
  created_at: string;
}

export interface RepasseFilters {
  startDate?: string;
  endDate?: string;
  status?: string;
}

export function usePJRepasses(tenantId: string, pjId: string, filters: RepasseFilters = {}) {
  return useQuery({
    queryKey: ["pj-repasses", tenantId, pjId, filters],
    enabled: !!tenantId && !!pjId,
    staleTime: 2 * 60_000,
    queryFn: async () => {
      let query = (supabase as any)
        .from("pj_repasse_history")
        .select("id, valor, data_repasse, status, comprovante_url, payable_id, contract_id, schedule_id, confirmed_at, created_at")
        .eq("tenant_id", tenantId)
        .eq("pj_id", pjId)
        .order("data_repasse", { ascending: false });

      if (filters.startDate) query = query.gte("data_repasse", filters.startDate);
      if (filters.endDate) query = query.lte("data_repasse", filters.endDate);
      if (filters.status && filters.status !== "todos") query = query.eq("status", filters.status);

      const { data, error } = await query;
      if (error) {
        console.error("[usePJRepasses]", error);
        return [];
      }
      return (data ?? []) as PJRepasse[];
    },
  });
}
