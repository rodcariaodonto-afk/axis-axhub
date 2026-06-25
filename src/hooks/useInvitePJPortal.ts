import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface InvitePJPortalPayload {
  pj_id: string;
  email: string;
  access_level: "view" | "edit" | "admin";
}

export interface InvitePJPortalResult {
  success: boolean;
  user_id: string;
  portal_access_id: string;
  is_new_user: boolean;
}

export function useInvitePJPortal() {
  return useMutation({
    mutationFn: async (payload: InvitePJPortalPayload): Promise<InvitePJPortalResult> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const supabaseUrl = (supabase as any).supabaseUrl as string;
      const res = await fetch(`${supabaseUrl}/functions/v1/invite-pj-to-portal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro ao enviar convite");
      return json as InvitePJPortalResult;
    },
  });
}
