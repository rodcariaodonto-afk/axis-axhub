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
    if (!isAdmin) throw new Error("Only admins can resend invites");

    const { user_id } = await req.json();
    if (!user_id) throw new Error("Missing user_id");

    // Get user profile
    const { data: profile } = await adminClient
      .from("profiles")
      .select("email, tenant_id")
      .eq("id", user_id)
      .single();
    if (!profile?.email) throw new Error("User not found");

    // Verify same tenant
    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("tenant_id")
      .eq("id", caller.id)
      .single();
    if (callerProfile?.tenant_id !== profile.tenant_id) throw new Error("User not in your tenant");

    // Generate an invite link for the user (works even if user exists but hasn't confirmed)
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "invite",
      email: profile.email,
    });

    if (linkError) {
      // Fallback: send a recovery/password-reset email instead
      const { error: resetError } = await adminClient.auth.admin.generateLink({
        type: "recovery",
        email: profile.email,
      });
      if (resetError) throw resetError;

      // Also explicitly send the recovery email
      const { error: sendError } = await adminClient.auth.resetPasswordForEmail(profile.email, {
        redirectTo: `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/auth`,
      });
      if (sendError) throw sendError;

      return new Response(JSON.stringify({ 
        success: true, 
        method: "recovery",
        message: "E-mail de recuperação de senha enviado" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If generateLink worked, we also need to actually send the invite email
    // Re-invite the user to trigger the email
    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(profile.email, {
      data: { full_name: profile.email },
    });
    
    // If invite fails (user already registered), fallback to password reset
    if (inviteError) {
      const { error: sendError } = await adminClient.auth.resetPasswordForEmail(profile.email, {
        redirectTo: `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/auth`,
      });
      if (sendError) throw sendError;

      return new Response(JSON.stringify({ 
        success: true, 
        method: "recovery",
        message: "E-mail de recuperação de senha enviado" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      method: "invite",
      message: "Convite reenviado com sucesso" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
