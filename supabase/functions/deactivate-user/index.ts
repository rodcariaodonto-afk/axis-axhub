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

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) throw new Error("Unauthorized");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: isAdmin } = await adminClient.rpc("has_role", { _user_id: caller.id, _role: "admin" });
    if (!isAdmin) throw new Error("Only admins can deactivate users");

    const { user_id } = await req.json();
    if (!user_id) throw new Error("Missing user_id");
    if (user_id === caller.id) throw new Error("Você não pode desativar sua própria conta");

    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("tenant_id")
      .eq("id", caller.id)
      .single();

    if (!callerProfile?.tenant_id) throw new Error("Caller profile not found");

    const { data: targetProfile } = await adminClient
      .from("profiles")
      .select("id, tenant_id, full_name, email, status, is_active")
      .eq("id", user_id)
      .single();

    if (!targetProfile) throw new Error("User not found");
    if (targetProfile.tenant_id !== callerProfile.tenant_id) {
      throw new Error("User not in your tenant");
    }

    const beforeJson = {
      status: targetProfile.status,
      is_active: targetProfile.is_active,
      full_name: targetProfile.full_name,
      email: targetProfile.email,
    };

    const { error: updateError } = await adminClient
      .from("profiles")
      .update({ status: "inactive", is_active: false } as never)
      .eq("id", user_id);

    if (updateError) throw updateError;

    await adminClient.from("audit_logs").insert({
      tenant_id: callerProfile.tenant_id,
      actor_user_id: caller.id,
      entity: "users",
      entity_id: user_id,
      action: "deactivate",
      before_json: beforeJson,
      after_json: { ...beforeJson, status: "inactive", is_active: false },
      ip_address: req.headers.get("x-forwarded-for"),
      user_agent: req.headers.get("user-agent"),
    } as never);

    return new Response(JSON.stringify({ success: true, user_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
