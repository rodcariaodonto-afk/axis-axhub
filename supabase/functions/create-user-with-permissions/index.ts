import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) throw new Error("Unauthorized");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: isAdmin } = await adminClient.rpc("has_role", { _user_id: caller.id, _role: "admin" });
    if (!isAdmin) throw new Error("Only admins can create users");

    // Get caller tenant
    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("tenant_id")
      .eq("id", caller.id)
      .single();
    if (!callerProfile) throw new Error("Caller profile not found");
    const tenantId = callerProfile.tenant_id;

    const body = await req.json();
    const { email, password, full_name, phone, birth_date, role, default_theme, default_menu, farewell_message, work_hours, permissions } = body;

    if (!email || !password || !full_name || !role) {
      throw new Error("Missing required fields: email, password, full_name, role");
    }

    // Create auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });
    if (authError) throw authError;
    const newUserId = authData.user.id;

    // Update profile (created by trigger) with extra fields
    const profileUpdate: Record<string, unknown> = {
      tenant_id: tenantId,
      full_name,
      email,
      phone: phone || null,
      birth_date: birth_date || null,
      default_theme: default_theme || "dark",
      default_menu: default_menu || "open",
      farewell_message: farewell_message || null,
      status: "active",
    };

    // The handle_new_user trigger creates a profile with a NEW tenant. 
    // We need to update it to use the caller's tenant instead.
    await adminClient.from("profiles").update(profileUpdate).eq("id", newUserId);

    // Delete the auto-created tenant (from trigger) if different
    const { data: newProfile } = await adminClient.from("profiles").select("tenant_id").eq("id", newUserId).single();
    // The trigger created a separate tenant - we already updated to caller's tenant
    // Now delete orphan tenant if needed (the trigger-created one)

    // Update role - delete the auto-created admin role and set the correct one
    await adminClient.from("user_roles").delete().eq("user_id", newUserId);
    await adminClient.from("user_roles").insert({ user_id: newUserId, role });

    // Insert work hours
    if (work_hours && Array.isArray(work_hours)) {
      const workHoursRows = work_hours.map((wh: any) => ({
        tenant_id: tenantId,
        user_id: newUserId,
        day_of_week: wh.day_of_week,
        start_time: wh.start_time || "08:00",
        end_time: wh.end_time || "18:00",
        is_working_day: wh.is_working_day ?? true,
      }));
      await adminClient.from("user_work_hours").insert(workHoursRows);
    }

    // Insert permissions
    if (permissions && Array.isArray(permissions)) {
      const permRows = permissions.map((p: any) => ({
        tenant_id: tenantId,
        user_id: newUserId,
        module_name: p.module_name,
        can_view: p.can_view ?? false,
        can_create: p.can_create ?? false,
        can_edit: p.can_edit ?? false,
        can_delete: p.can_delete ?? false,
        can_export: p.can_export ?? false,
        can_manage_users: p.can_manage_users ?? false,
      }));
      await adminClient.from("user_permissions").insert(permRows);
    }

    // Audit log
    await adminClient.from("audit_logs").insert({
      tenant_id: tenantId,
      actor_user_id: caller.id,
      entity: "users",
      entity_id: newUserId,
      action: "create",
      after_json: { email, full_name, role },
    });

    return new Response(JSON.stringify({ success: true, user_id: newUserId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
