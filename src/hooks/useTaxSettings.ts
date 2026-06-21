import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getUserTenantId } from "@/lib/getUserTenantId";

export type RegimeTributario = "simples_nacional" | "lucro_presumido" | "lucro_real" | "mei";

export const REGIME_LABELS: Record<RegimeTributario, string> = {
  simples_nacional: "Simples Nacional",
  lucro_presumido:  "Lucro Presumido",
  lucro_real:       "Lucro Real",
  mei:              "MEI",
};

export interface TaxSettings {
  id: string;
  tenant_id: string;
  pj_id: string;
  pj_name: string | null;
  regime_tributario: RegimeTributario;
  aliquota_ir: number;
  aliquota_pis: number;
  aliquota_cofins: number;
  aliquota_inss: number;
  aliquota_iss: number;
  aliquota_csll: number;
  created_at: string;
  updated_at: string;
}

export interface SaveTaxSettingsInput {
  pjId: string;
  regime_tributario: RegimeTributario;
  aliquota_ir: number;
  aliquota_pis: number;
  aliquota_cofins: number;
  aliquota_inss: number;
  aliquota_iss: number;
  aliquota_csll: number;
}

// Suggested rates by regime
export const SUGGESTED_RATES: Record<RegimeTributario, Omit<SaveTaxSettingsInput, "pjId" | "regime_tributario">> = {
  simples_nacional: { aliquota_ir: 0, aliquota_pis: 0, aliquota_cofins: 0, aliquota_inss: 0, aliquota_iss: 0, aliquota_csll: 0 },
  mei:              { aliquota_ir: 0, aliquota_pis: 0, aliquota_cofins: 0, aliquota_inss: 0, aliquota_iss: 0, aliquota_csll: 0 },
  lucro_presumido:  { aliquota_ir: 1.5, aliquota_pis: 0.65, aliquota_cofins: 3, aliquota_inss: 11, aliquota_iss: 5, aliquota_csll: 1 },
  lucro_real:       { aliquota_ir: 1.5, aliquota_pis: 0.65, aliquota_cofins: 3, aliquota_inss: 11, aliquota_iss: 5, aliquota_csll: 1 },
};

export function useTaxSettingsList() {
  return useQuery({
    queryKey: ["tax-settings"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pj_tax_settings")
        .select("*, crm_accounts(name)")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("[useTaxSettingsList]", error);
        return [];
      }
      return ((data ?? []) as any[]).map((r) => ({
        ...r,
        pj_name: (r.crm_accounts as any)?.name ?? null,
      })) as TaxSettings[];
    },
  });
}

export function useTaxSettingsForPJ(pjId: string) {
  return useQuery({
    queryKey: ["tax-settings", pjId],
    enabled: !!pjId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pj_tax_settings")
        .select("*")
        .eq("pj_id", pjId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as TaxSettings | null;
    },
  });
}

export function useSaveTaxSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveTaxSettingsInput) => {
      const tenantId = await getUserTenantId();
      if (!tenantId) throw new Error("Tenant não encontrado");

      const { error } = await (supabase as any)
        .from("pj_tax_settings")
        .upsert(
          {
            tenant_id: tenantId,
            pj_id: input.pjId,
            regime_tributario: input.regime_tributario,
            aliquota_ir: input.aliquota_ir,
            aliquota_pis: input.aliquota_pis,
            aliquota_cofins: input.aliquota_cofins,
            aliquota_inss: input.aliquota_inss,
            aliquota_iss: input.aliquota_iss,
            aliquota_csll: input.aliquota_csll,
          },
          { onConflict: "tenant_id,pj_id" }
        );
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["tax-settings"] });
      queryClient.invalidateQueries({ queryKey: ["tax-settings", vars.pjId] });
    },
  });
}
