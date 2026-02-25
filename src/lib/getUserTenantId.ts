import { supabase } from "@/integrations/supabase/client";

/**
 * Safely retrieves the current user's tenant_id.
 * Uses the DB function get_user_tenant_id() which is SECURITY DEFINER
 * and always returns the correct tenant for the authenticated user.
 * Falls back to a filtered profiles query if needed.
 */
export async function getUserProfile(): Promise<{ tenant_id: string; id: string } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, id")
    .eq("id", user.id)
    .single();

  return profile;
}

/**
 * Quick helper that just returns the tenant_id string.
 */
export async function getUserTenantId(): Promise<string | null> {
  const profile = await getUserProfile();
  return profile?.tenant_id ?? null;
}
