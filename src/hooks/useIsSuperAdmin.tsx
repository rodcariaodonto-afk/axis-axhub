import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Hook que retorna se o usuario autenticado atual eh super admin da plataforma.
 *
 * Super admin: membro do time interno AXHolding com acesso cross-tenant
 * via tabela `super_admins` no banco.
 *
 * Comportamento:
 * - Enquanto auth.loading: isLoading = true, isSuperAdmin = false
 * - Sem usuario logado: nao executa query, isSuperAdmin = false
 * - Com usuario logado: chama RPC is_super_admin() no Supabase
 * - Cache de 5 minutos (super admin status muda raramente)
 */
export function useIsSuperAdmin() {
  const { user, loading: authLoading } = useAuth();

  const { data, isLoading: queryLoading } = useQuery({
    queryKey: ["is-super-admin", user?.id],
    enabled: !!user && !authLoading,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      // Cast com `as any` porque a RPC foi criada recentemente
      // e ainda nao esta no types.ts gerado pela Lovable.
      // Apos regeneracao automatica, este cast pode ser removido.
      const { data, error } = await (supabase as any).rpc("is_super_admin");
      if (error) {
        console.error("[useIsSuperAdmin] RPC error:", error);
        return false;
      }
      return Boolean(data);
    },
  });

  return {
    isSuperAdmin: !!data,
    isLoading: authLoading || (!!user && queryLoading),
  };
}
