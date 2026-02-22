import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub;

    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", userId).single();
    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), { status: 404, headers: corsHeaders });
    }
    const tenantId = profile.tenant_id;

    const { session_id, phone, message, contact_id } = await req.json();
    if (!session_id || !phone || !message) {
      return new Response(JSON.stringify({ error: "session_id, phone, message required" }), { status: 400, headers: corsHeaders });
    }

    // Get session
    const { data: session } = await supabase
      .from("whatsapp_sessions")
      .select("*")
      .eq("id", session_id)
      .eq("tenant_id", tenantId)
      .single();

    if (!session || session.status !== "connected") {
      return new Response(JSON.stringify({ error: "Session not connected" }), { status: 400, headers: corsHeaders });
    }

    // Get settings
    const { data: settings } = await supabase
      .from("whatsapp_settings")
      .select("evolution_api_url, evolution_api_key")
      .eq("tenant_id", tenantId)
      .single();

    const evolutionUrl = settings?.evolution_api_url || Deno.env.get("EVOLUTION_API_URL");
    const evolutionKey = settings?.evolution_api_key || Deno.env.get("EVOLUTION_API_KEY");

    // Send via Evolution API
    const formattedPhone = phone.replace(/\D/g, "");
    const evolutionRes = await fetch(
      `${evolutionUrl}/message/sendText/${session.evolution_instance_id}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: evolutionKey! },
        body: JSON.stringify({
          number: formattedPhone,
          text: message,
        }),
      }
    );

    const evolutionData = await evolutionRes.json();
    if (!evolutionRes.ok) {
      return new Response(JSON.stringify({ error: "Failed to send", details: evolutionData }), { status: 502, headers: corsHeaders });
    }

    // Save message
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: msg, error: msgError } = await serviceClient
      .from("whatsapp_messages")
      .insert({
        tenant_id: tenantId,
        session_id,
        contact_id: contact_id || null,
        contact_phone: formattedPhone,
        message_type: "text",
        content: message,
        direction: "outbound",
        status: "sent",
        whatsapp_message_id: evolutionData?.key?.id || null,
      })
      .select()
      .single();

    // Update contact last_message_at
    if (contact_id) {
      await serviceClient
        .from("whatsapp_contacts")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", contact_id);
    }

    return new Response(JSON.stringify({ message: msg }), { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
