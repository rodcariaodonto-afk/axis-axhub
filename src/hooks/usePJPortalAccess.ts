import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface PJTenantAccess {
  id: string;
  tenant_id: string;
  pj_id: string;
  access_level: string;
  tenant_name: string;
}

export interface PJPortalAccessResult {
  isPJ: boolean;
  pjId: string | null;
  tenantId: string | null;
  accessLevel: string | null;
  tenants: PJTenantAccess[];
  isLoading: boolean;
}

export function usePJPortalAccess(): PJPortalAccessResult {
  const { user, loading: authLoading } = useAuth();

  const { data: accessList = [], isLoading: queryLoading } = useQuery({
    queryKey: ["pj-portal-access", user?.id],
    enabled: !!user && !authLoading,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pj_portal_access")
        .select("id, tenant_id, pj_id, access_level, tenants(name)")
        .eq("user_id", user!.id);

      if (error) {
        console.error("[usePJPortalAccess]", error);
        return [];
      }

      return ((data as any[]) ?? []).map((row) => ({
        id: row.id as string,
        tenant_id: row.tenant_id as string,
        pj_id: row.pj_id as string,
        access_level: row.access_level as string,
        tenant_name: (row.tenants as any)?.name ?? row.tenant_id,
      })) as PJTenantAccess[];
    },
  });

  const isPJ = accessList.length > 0;
  const first = accessList[0] ?? null;

  return {
    isPJ,
    pjId: first?.pj_id ?? null,
    tenantId: first?.tenant_id ?? null,
    accessLevel: first?.access_level ?? null,
    tenants: accessList,
    isLoading: authLoading || (!!user && queryLoading),
  };
}
