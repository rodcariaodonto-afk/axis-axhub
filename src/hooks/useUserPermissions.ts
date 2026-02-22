import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type PermissionAction = "view" | "create" | "edit" | "delete" | "export" | "manage_users";

interface UserPermission {
  module_name: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_export: boolean;
  can_manage_users: boolean;
}

export function useUserPermissions() {
  const { user } = useAuth();

  const { data: permissions, isLoading } = useQuery({
    queryKey: ["user-permissions", user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_permissions")
        .select("module_name, can_view, can_create, can_edit, can_delete, can_export, can_manage_users")
        .eq("user_id", user!.id);
      return (data || []) as UserPermission[];
    },
  });

  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin-perm", user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase.rpc("has_role", { _user_id: user!.id, _role: "admin" });
      return !!data;
    },
  });

  const hasPermission = (module: string, action: PermissionAction): boolean => {
    if (isAdmin) return true;
    const perm = permissions?.find((p) => p.module_name === module);
    if (!perm) return false;
    switch (action) {
      case "view": return perm.can_view;
      case "create": return perm.can_create;
      case "edit": return perm.can_edit;
      case "delete": return perm.can_delete;
      case "export": return perm.can_export;
      case "manage_users": return perm.can_manage_users;
      default: return false;
    }
  };

  return { permissions, isLoading, hasPermission, isAdmin };
}
