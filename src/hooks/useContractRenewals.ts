import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ContractRenewal {
  id: string;
  tenant_id: string;
  contract_id: string;
  original_end_date: string;
  new_start_date: string;
  new_end_date: string;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  new_contract_id: string | null;
  created_at: string;
  // joined
  contract_name: string | null;
  contract_value: number | null;
  contract_account_id: string | null;
  contract_tenant_id: string | null;
}

export function useContractRenewals(statusFilter?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const qKey = ["contract-renewals", statusFilter];

  const query = useQuery({
    queryKey: qKey,
    staleTime: 2 * 60_000,
    queryFn: async () => {
      let q = (supabase as any)
        .from("contract_renewals")
        .select("*, contracts(name, value, account_id, tenant_id, status, contract_type, description, auto_renew, currency, mrr)")
        .order("created_at", { ascending: false });

      if (statusFilter && statusFilter !== "todos") {
        q = q.eq("status", statusFilter);
      }

      const { data, error } = await q;
      if (error) {
        console.error("[useContractRenewals]", error);
        return [];
      }

      return ((data as any[]) ?? []).map((row) => ({
        id: row.id as string,
        tenant_id: row.tenant_id as string,
        contract_id: row.contract_id as string,
        original_end_date: row.original_end_date as string,
        new_start_date: row.new_start_date as string,
        new_end_date: row.new_end_date as string,
        status: row.status as string,
        approved_by: row.approved_by as string | null,
        approved_at: row.approved_at as string | null,
        new_contract_id: row.new_contract_id as string | null,
        created_at: row.created_at as string,
        contract_name: row.contracts?.name ?? null,
        contract_value: row.contracts?.value ?? null,
        contract_account_id: row.contracts?.account_id ?? null,
        contract_tenant_id: row.contracts?.tenant_id ?? null,
        // raw contract for copy
        _contract: row.contracts,
      })) as (ContractRenewal & { _contract: any })[];
    },
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["contract-renewals"] });
    queryClient.invalidateQueries({ queryKey: ["contract-vigency"] });
  }

  const approve = useMutation({
    mutationFn: async (renewal: ContractRenewal & { _contract: any }) => {
      const orig = renewal._contract;
      if (!orig) throw new Error("Contrato original não encontrado");

      // 1. Create new contract (copy with updated dates)
      const { data: newContract, error: insertError } = await supabase
        .from("contracts")
        .insert({
          tenant_id: renewal.contract_tenant_id ?? renewal.tenant_id,
          name: `${orig.name} (renovado)`,
          account_id: orig.account_id ?? null,
          status: "Ativo",
          start_date: renewal.new_start_date,
          end_date: renewal.new_end_date,
          value: orig.value ?? null,
          currency: orig.currency ?? "BRL",
          contract_type: orig.contract_type ?? null,
          description: orig.description ?? null,
          auto_renew: orig.auto_renew ?? false,
          mrr: orig.mrr ?? null,
          is_active: true,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      // 2. Update renewal record
      const { error: updateError } = await (supabase as any)
        .from("contract_renewals")
        .update({
          status: "executada",
          new_contract_id: newContract.id,
          approved_by: user?.id ?? null,
          approved_at: new Date().toISOString(),
        })
        .eq("id", renewal.id);

      if (updateError) throw updateError;
    },
    onSuccess: invalidate,
  });

  const reject = useMutation({
    mutationFn: async (renewalId: string) => {
      const { error } = await (supabase as any)
        .from("contract_renewals")
        .update({ status: "rejeitada" })
        .eq("id", renewalId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { ...query, approve, reject };
}
