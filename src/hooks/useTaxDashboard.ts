import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TaxRetentionRow {
  id: string;
  pj_id: string;
  pj_name: string | null;
  nf_number: string | null;
  nf_approval_id: string | null;
  valor_bruto: number;
  ir_value: number;
  pis_value: number;
  cofins_value: number;
  inss_value: number;
  iss_value: number;
  csll_value: number;
  total_retention: number;
  valor_liquido: number;
  rpa_url: string | null;
  created_at: string;
}

export interface TaxDashboardFilters {
  startDate?: string;
  endDate?: string;
  pjId?: string;
}

export interface TaxTotals {
  ir: number;
  pis: number;
  cofins: number;
  inss: number;
  iss: number;
  csll: number;
  totalRetention: number;
  valorBruto: number;
  valorLiquido: number;
  count: number;
}

export function useTaxRetentions(filters: TaxDashboardFilters = {}) {
  return useQuery({
    queryKey: ["tax-retentions", filters],
    staleTime: 3 * 60_000,
    queryFn: async () => {
      let query = (supabase as any)
        .from("pj_tax_retentions")
        .select("*, crm_accounts(name), nf_approvals(nf_number)")
        .order("created_at", { ascending: false });

      if (filters.startDate) query = query.gte("created_at", filters.startDate);
      if (filters.endDate) {
        // include full end day
        const end = new Date(filters.endDate);
        end.setDate(end.getDate() + 1);
        query = query.lt("created_at", end.toISOString().slice(0, 10));
      }
      if (filters.pjId) query = query.eq("pj_id", filters.pjId);

      const { data, error } = await query;
      if (error) {
        console.error("[useTaxRetentions]", error);
        return [];
      }

      return ((data ?? []) as any[]).map((r): TaxRetentionRow => ({
        id: r.id,
        pj_id: r.pj_id,
        pj_name: (r.crm_accounts as any)?.name ?? null,
        nf_number: (r.nf_approvals as any)?.nf_number ?? null,
        nf_approval_id: r.nf_approval_id,
        valor_bruto:     Number(r.valor_bruto),
        ir_value:        Number(r.ir_value),
        pis_value:       Number(r.pis_value),
        cofins_value:    Number(r.cofins_value),
        inss_value:      Number(r.inss_value),
        iss_value:       Number(r.iss_value),
        csll_value:      Number(r.csll_value),
        total_retention: Number(r.total_retention),
        valor_liquido:   Number(r.valor_liquido),
        rpa_url:         r.rpa_url ?? null,
        created_at:      r.created_at,
      }));
    },
  });
}

export function useTaxTotals(rows: TaxRetentionRow[]): TaxTotals {
  return rows.reduce<TaxTotals>(
    (acc, r) => ({
      ir:             acc.ir + r.ir_value,
      pis:            acc.pis + r.pis_value,
      cofins:         acc.cofins + r.cofins_value,
      inss:           acc.inss + r.inss_value,
      iss:            acc.iss + r.iss_value,
      csll:           acc.csll + r.csll_value,
      totalRetention: acc.totalRetention + r.total_retention,
      valorBruto:     acc.valorBruto + r.valor_bruto,
      valorLiquido:   acc.valorLiquido + r.valor_liquido,
      count:          acc.count + 1,
    }),
    { ir: 0, pis: 0, cofins: 0, inss: 0, iss: 0, csll: 0, totalRetention: 0, valorBruto: 0, valorLiquido: 0, count: 0 }
  );
}

export function useTaxRetentionForNF(nfApprovalId: string | undefined) {
  return useQuery({
    queryKey: ["tax-retention-for-nf", nfApprovalId],
    enabled: !!nfApprovalId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pj_tax_retentions")
        .select("*")
        .eq("nf_approval_id", nfApprovalId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        id: data.id,
        pj_id: data.pj_id,
        nf_approval_id: data.nf_approval_id,
        valor_bruto:     Number(data.valor_bruto),
        ir_value:        Number(data.ir_value),
        pis_value:       Number(data.pis_value),
        cofins_value:    Number(data.cofins_value),
        inss_value:      Number(data.inss_value),
        iss_value:       Number(data.iss_value),
        csll_value:      Number(data.csll_value),
        total_retention: Number(data.total_retention),
        valor_liquido:   Number(data.valor_liquido),
        rpa_url:         data.rpa_url as string | null,
      };
    },
  });
}

export function useGenerateRPA() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taxRetentionId: string) => {
      const { data, error } = await supabase.functions.invoke("generate-rpa", {
        body: { pj_tax_retention_id: taxRetentionId },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data as { rpa_url: string };
    },
    onSuccess: (_data, retentionId) => {
      queryClient.invalidateQueries({ queryKey: ["tax-retention-for-nf"] });
      queryClient.invalidateQueries({ queryKey: ["tax-retentions"] });
    },
  });
}
