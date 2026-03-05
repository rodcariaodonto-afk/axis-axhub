import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Get caller user
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { contact_id, to_user_id, to_queue_id, reason } = await req.json();
    if (!contact_id) throw new Error("contact_id is required");
    if (!to_user_id && !to_queue_id) throw new Error("to_user_id or to_queue_id is required");

    // Get caller's tenant
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();
    if (!profile) throw new Error("Profile not found");
    const tenantId = profile.tenant_id;

    // Get current assignment
    const { data: currentStatus } = await supabaseAdmin
      .from("whatsapp_contact_status")
      .select("id, assigned_to")
      .eq("contact_id", contact_id)
      .single();

    const fromUserId = currentStatus?.assigned_to || null;

    // Determine target user: if transferring to queue, pick a random member
    let targetUserId = to_user_id;
    if (!targetUserId && to_queue_id) {
      const { data: members } = await supabaseAdmin
        .from("whatsapp_queue_members")
        .select("user_id")
        .eq("queue_id", to_queue_id);
      if (members && members.length > 0) {
        targetUserId = members[Math.floor(Math.random() * members.length)].user_id;
      }
    }

    // Update assignment in whatsapp_contact_status
    if (currentStatus) {
      await supabaseAdmin
        .from("whatsapp_contact_status")
        .update({
          assigned_to: targetUserId || null,
          status: "open",
          last_status_change: new Date().toISOString(),
        })
        .eq("id", currentStatus.id);
    } else {
      await supabaseAdmin
        .from("whatsapp_contact_status")
        .insert({
          tenant_id: tenantId,
          contact_id,
          assigned_to: targetUserId || null,
          status: "open",
        });
    }

    // Log the transfer
    await supabaseAdmin.from("whatsapp_transfer_logs").insert({
      tenant_id: tenantId,
      contact_id,
      from_user_id: fromUserId,
      to_user_id: targetUserId || null,
      to_queue_id: to_queue_id || null,
      reason: reason || null,
      transferred_by: user.id,
    });

    return new Response(
      JSON.stringify({ success: true, assigned_to: targetUserId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
