import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getUserTenantId } from "@/lib/getUserTenantId";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PJProvider {
  id: string;
  name: string;
  cnpj: string | null;
}

export interface RepasseAdmin {
  id: string;
  tenant_id: string;
  pj_id: string;
  pj_name: string | null;
  payable_id: string | null;
  contract_id: string | null;
  valor: number;
  data_repasse: string;
  status: string;
  comprovante_url: string | null;
  pix_payload: string | null;
  pix_qrcode_url: string | null;
  created_at: string;
}

export interface RepasseAdminFilters {
  pjId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

export interface CreateRepasseInput {
  pjId: string;
  valor: number;
  dataRepasse: string;
  descricao?: string;
  contractId?: string | null;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function usePJProviders() {
  return useQuery({
    queryKey: ["pj-providers"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("crm_accounts")
        .select("id, name, cnpj")
        .eq("account_type", "pj_provider")
        .eq("is_active", true)
        .order("name");
      if (error) {
        console.error("[usePJProviders]", error);
        return [];
      }
      return (data ?? []) as PJProvider[];
    },
  });
}

export function useRepassesAdmin(filters: RepasseAdminFilters = {}) {
  return useQuery({
    queryKey: ["repasses-admin", filters],
    staleTime: 2 * 60_000,
    queryFn: async () => {
      let q = (supabase as any)
        .from("pj_repasse_history")
        .select("id, tenant_id, pj_id, payable_id, contract_id, valor, data_repasse, status, comprovante_url, pix_payload, pix_qrcode_url, created_at, crm_accounts(name)")
        .order("data_repasse", { ascending: false });

      if (filters.pjId && filters.pjId !== "todos") q = q.eq("pj_id", filters.pjId);
      if (filters.startDate) q = q.gte("data_repasse", filters.startDate);
      if (filters.endDate) q = q.lte("data_repasse", filters.endDate);
      if (filters.status && filters.status !== "todos") q = q.eq("status", filters.status);

      const { data, error } = await q;
      if (error) {
        console.error("[useRepassesAdmin]", error);
        return [];
      }
      return ((data as any[]) ?? []).map((r) => ({
        ...r,
        pj_name: (r.crm_accounts as any)?.name ?? null,
      })) as RepasseAdmin[];
    },
  });
}

export function useCreateRepasse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateRepasseInput) => {
      const tenantId = await getUserTenantId();
      if (!tenantId) throw new Error("Tenant não encontrado");

      // 1. Create payable (using as any for pj_id column not yet in types.ts)
      const { data: payable, error: payableErr } = await (supabase as any)
        .from("payables")
        .insert({
          tenant_id: tenantId,
          description: input.descricao || `Repasse PJ — ${input.dataRepasse}`,
          amount: input.valor,
          due_date: input.dataRepasse,
          status: "pendente",
          pj_id: input.pjId,
          repasse_type: "manual",
          repasse_status: "pendente",
        })
        .select("id")
        .single();

      if (payableErr) throw payableErr;

      // 2. Create pj_repasse_history
      const { error: histErr } = await (supabase as any)
        .from("pj_repasse_history")
        .insert({
          tenant_id: tenantId,
          pj_id: input.pjId,
          payable_id: payable.id,
          contract_id: input.contractId ?? null,
          valor: input.valor,
          data_repasse: input.dataRepasse,
          status: "pendente",
        });

      if (histErr) throw histErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repasses-admin"] });
      queryClient.invalidateQueries({ queryKey: ["pj-repasses"] });
    },
  });
}

export function useUpdateRepasseStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any)
        .from("pj_repasse_history")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repasses-admin"] });
      queryClient.invalidateQueries({ queryKey: ["pj-repasses"] });
    },
  });
}

export function useUploadComprovante() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ repasse, file }: { repasse: RepasseAdmin; file: File }) => {
      const path = `${repasse.tenant_id}/${repasse.pj_id}/comprovante/${repasse.id}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

      const { error: uploadErr } = await supabase.storage
        .from("pj-documents")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage.from("pj-documents").getPublicUrl(path);

      const { error: updateErr } = await (supabase as any)
        .from("pj_repasse_history")
        .update({ comprovante_url: publicUrl, status: "pago" })
        .eq("id", repasse.id);

      if (updateErr) throw updateErr;
      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repasses-admin"] });
      queryClient.invalidateQueries({ queryKey: ["pj-repasses"] });
    },
  });
}
