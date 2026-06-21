import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, parseISO, addDays } from "date-fns";

export type VigencyStatus = "vencido" | "vencendo_30d" | "vigente" | "sem_vigencia";

export interface ContractWithVigency {
  id: string;
  name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  value: number | null;
  auto_renew: boolean | null;
  account_id: string | null;
  account_name: string | null;
  vigency: VigencyStatus;
  days_until_expiry: number | null;
}

export interface VigencyCounts {
  vencido: number;
  vencendo_30d: number;
  vigente: number;
  sem_vigencia: number;
  total: number;
}

export interface VigencyFilters {
  accountId?: string;
  status?: VigencyStatus | "todos";
}

function computeVigency(endDate: string | null): { vigency: VigencyStatus; days: number | null } {
  if (!endDate) return { vigency: "sem_vigencia", days: null };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = parseISO(endDate);
  const days = differenceInDays(end, today);
  if (days < 0) return { vigency: "vencido", days };
  if (days <= 30) return { vigency: "vencendo_30d", days };
  return { vigency: "vigente", days };
}

export function useContractVigency(filters: VigencyFilters = {}) {
  const { data: rawContracts = [], isLoading } = useQuery({
    queryKey: ["contract-vigency"],
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("id, name, status, start_date, end_date, value, auto_renew, account_id, crm_accounts(name)")
        .eq("is_active", true)
        .order("end_date", { ascending: true, nullsFirst: false });

      if (error) {
        console.error("[useContractVigency]", error);
        return [];
      }
      return data ?? [];
    },
  });

  const contracts: ContractWithVigency[] = rawContracts.map((c: any) => {
    const { vigency, days } = computeVigency(c.end_date);
    return {
      id: c.id,
      name: c.name,
      status: c.status,
      start_date: c.start_date,
      end_date: c.end_date,
      value: c.value,
      auto_renew: c.auto_renew,
      account_id: c.account_id,
      account_name: c.crm_accounts?.name ?? null,
      vigency,
      days_until_expiry: days,
    };
  });

  // Apply filters client-side
  const filtered = contracts.filter((c) => {
    if (filters.accountId && c.account_id !== filters.accountId) return false;
    if (filters.status && filters.status !== "todos" && c.vigency !== filters.status) return false;
    return true;
  });

  const counts: VigencyCounts = {
    vencido: contracts.filter((c) => c.vigency === "vencido").length,
    vencendo_30d: contracts.filter((c) => c.vigency === "vencendo_30d").length,
    vigente: contracts.filter((c) => c.vigency === "vigente").length,
    sem_vigencia: contracts.filter((c) => c.vigency === "sem_vigencia").length,
    total: contracts.length,
  };

  return { contracts: filtered, counts, isLoading };
}

export function useContractAccounts() {
  return useQuery({
    queryKey: ["contract-accounts"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_accounts")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) return [];
      return (data ?? []) as { id: string; name: string }[];
    },
  });
}
