import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PJContract {
  id: string;
  name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  value: number | null;
  auto_renew: boolean | null;
  is_active: boolean;
  contract_type: string | null;
  description: string | null;
  alert_days_before_expiry: number | null;
}

export function usePJContracts(tenantId: string, pjId: string) {
  return useQuery({
    queryKey: ["pj-contracts", tenantId, pjId],
    enabled: !!tenantId && !!pjId,
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("id, name, status, start_date, end_date, value, auto_renew, is_active, contract_type, description")
        .eq("tenant_id", tenantId)
        .eq("account_id", pjId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[usePJContracts]", error);
        return [];
      }

      return (data ?? []) as PJContract[];
    },
  });
}
