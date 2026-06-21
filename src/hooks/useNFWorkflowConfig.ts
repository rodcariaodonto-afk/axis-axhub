import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getUserTenantId } from "@/lib/getUserTenantId";

export interface NFWorkflowConfig {
  id: string;
  tenant_id: string;
  approval_levels: number;
  level1_approver_id: string | null;
  level2_approver_id: string | null;
  level3_approver_id: string | null;
  auto_create_payable: boolean;
  sefaz_validation_enabled: boolean;
}

export interface TenantUser {
  id: string;
  full_name: string | null;
  email: string;
}

export function useNFWorkflowConfig() {
  return useQuery({
    queryKey: ["nf-workflow-config"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("nf_workflow_config")
        .select("*")
        .maybeSingle();
      if (error) {
        console.error("[useNFWorkflowConfig]", error);
        return null;
      }
      return data as NFWorkflowConfig | null;
    },
  });
}

export function useTenantUsers() {
  return useQuery({
    queryKey: ["tenant-users"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name");
      if (error) return [];
      return (data ?? []) as TenantUser[];
    },
  });
}

export function useSaveNFWorkflowConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: Omit<NFWorkflowConfig, "id" | "tenant_id">) => {
      const tenantId = await getUserTenantId();
      if (!tenantId) throw new Error("Tenant não encontrado");
      const { error } = await (supabase as any)
        .from("nf_workflow_config")
        .upsert(
          {
            tenant_id: tenantId,
            approval_levels: values.approval_levels,
            level1_approver_id: values.level1_approver_id || null,
            level2_approver_id: values.level2_approver_id || null,
            level3_approver_id: values.level3_approver_id || null,
            auto_create_payable: values.auto_create_payable,
            sefaz_validation_enabled: values.sefaz_validation_enabled,
          },
          { onConflict: "tenant_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["nf-workflow-config"] }),
  });
}
