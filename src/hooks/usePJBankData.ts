import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getUserTenantId } from "@/lib/getUserTenantId";

export type PixKeyType = "cpf" | "cnpj" | "email" | "telefone" | "aleatoria";
export type AccountType = "corrente" | "poupanca";

export const PIX_KEY_TYPE_LABELS: Record<PixKeyType, string> = {
  cpf:       "CPF",
  cnpj:      "CNPJ",
  email:     "E-mail",
  telefone:  "Telefone",
  aleatoria: "Chave aleatória",
};

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  corrente: "Conta corrente",
  poupanca: "Poupança",
};

export interface PJBankAccount {
  id: string;
  tenant_id: string;
  pj_id: string;
  name: string;
  bank_code: string | null;
  agency: string | null;
  account_number: string | null;
  account_type: AccountType | null;
  pix_key: string | null;
  pix_key_type: PixKeyType | null;
  cnpj_titular: string | null;
  balance: number;
  created_at: string;
}

export interface SavePJBankInput {
  pj_id: string;
  name: string;
  bank_code?: string | null;
  agency?: string | null;
  account_number?: string | null;
  account_type?: AccountType | null;
  pix_key?: string | null;
  pix_key_type?: PixKeyType | null;
  cnpj_titular?: string | null;
}

export function maskSensitive(value: string | null | undefined): string {
  if (!value) return "—";
  if (value.length <= 4) return "****";
  return "****" + value.slice(-4);
}

export function usePJBankAccounts(pjId: string | null) {
  return useQuery({
    queryKey: ["pj-bank-accounts", pjId],
    enabled: !!pjId,
    staleTime: 3 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("pj_id", pjId!)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("[usePJBankAccounts]", error);
        return [];
      }
      return (data ?? []) as PJBankAccount[];
    },
  });
}

export function useAllPJBankAccounts() {
  return useQuery({
    queryKey: ["all-pj-bank-accounts"],
    staleTime: 3 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*, crm_accounts(name)")
        .not("pj_id", "is", null)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("[useAllPJBankAccounts]", error);
        return [];
      }
      return ((data ?? []) as any[]).map((r) => ({
        ...r,
        pj_name: (r.crm_accounts as any)?.name ?? null,
      })) as (PJBankAccount & { pj_name: string | null })[];
    },
  });
}

export function useSavePJBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SavePJBankInput & { id?: string }) => {
      const tenantId = await getUserTenantId();
      if (!tenantId) throw new Error("Tenant não encontrado");

      const payload = {
        tenant_id: tenantId,
        pj_id: input.pj_id,
        name: input.name,
        bank_code: input.bank_code ?? null,
        agency: input.agency ?? null,
        account_number: input.account_number ?? null,
        account_type: input.account_type ?? null,
        pix_key: input.pix_key ?? null,
        pix_key_type: input.pix_key_type ?? null,
        cnpj_titular: input.cnpj_titular ?? null,
      };

      if (input.id) {
        const { error } = await supabase
          .from("bank_accounts")
          .update(payload)
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("bank_accounts")
          .insert({ ...payload, balance: 0 });
        if (error) throw error;
      }
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["pj-bank-accounts", vars.pj_id] });
      queryClient.invalidateQueries({ queryKey: ["all-pj-bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
    },
  });
}

export function useDeletePJBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, pjId }: { id: string; pjId: string }) => {
      const { error } = await supabase
        .from("bank_accounts")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return pjId;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["pj-bank-accounts", vars.pjId] });
      queryClient.invalidateQueries({ queryKey: ["all-pj-bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
    },
  });
}
