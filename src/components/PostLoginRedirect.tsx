import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePJPortalAccess } from "@/hooks/usePJPortalAccess";
import PageLoader from "@/components/PageLoader";

const ADMIN_ROLES = ["admin", "finance", "operations"];

export function PostLoginRedirect() {
  const { user } = useAuth();
  const { isPJ, tenants, isLoading: pjLoading } = usePJPortalAccess();
  const navigate = useNavigate();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile-role-redirect", user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user!.id)
        .single();
      return data as { role: string } | null;
    },
  });

  const isLoading = pjLoading || (!!user && profileLoading);

  useEffect(() => {
    if (isLoading) return;

    const role = profile?.role ?? "";
    const isAdminRole = ADMIN_ROLES.includes(role);

    if (isPJ && !isAdminRole) {
      navigate("/portal/dashboard", { replace: true });
    } else {
      navigate("/dashboard", { replace: true });
    }
  }, [isLoading, isPJ, tenants, profile, navigate]);

  return <PageLoader />;
}
