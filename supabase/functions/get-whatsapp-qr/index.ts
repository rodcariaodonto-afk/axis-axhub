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

    const url = new URL(req.url);
    const sessionId = url.searchParams.get("session_id");
    if (!sessionId) {
      return new Response(JSON.stringify({ error: "session_id required" }), { status: 400, headers: corsHeaders });
    }

    const { data: session } = await supabase
      .from("whatsapp_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("tenant_id", profile.tenant_id)
      .single();

    if (!session) {
      return new Response(JSON.stringify({ error: "Session not found" }), { status: 404, headers: corsHeaders });
    }

    // Get settings
    const { data: settings } = await supabase
      .from("whatsapp_settings")
      .select("evolution_api_url, evolution_api_key")
      .eq("tenant_id", profile.tenant_id)
      .single();

    const evolutionUrl = settings?.evolution_api_url || Deno.env.get("EVOLUTION_API_URL");
    const evolutionKey = settings?.evolution_api_key || Deno.env.get("EVOLUTION_API_KEY");

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check instance status from Evolution API
    let instanceStatus = session.status;
    try {
      const statusRes = await fetch(
        `${evolutionUrl}/instance/connectionState/${session.evolution_instance_id}`,
        { headers: { apikey: evolutionKey! } }
      );
      const statusData = await statusRes.json();
      console.log("Instance status:", JSON.stringify(statusData));

      const state = statusData?.instance?.state || statusData?.state;
      if (state === "open" || state === "connected") {
        instanceStatus = "connected";
        await serviceClient
          .from("whatsapp_sessions")
          .update({
            status: "connected",
            last_connected_at: new Date().toISOString(),
            qr_code: null,
            error_message: null,
          })
          .eq("id", sessionId);
        
        return new Response(JSON.stringify({
          qr_code: null,
          status: "connected",
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    } catch (statusErr) {
      console.error("Status check error:", statusErr);
    }

    // Fetch QR from Evolution
    const evolutionRes = await fetch(
      `${evolutionUrl}/instance/connect/${session.evolution_instance_id}`,
      { headers: { apikey: evolutionKey! } }
    );
    const evolutionData = await evolutionRes.json();
    console.log("Connect response keys:", Object.keys(evolutionData));

    // Update QR in DB
    if (evolutionData?.base64) {
      await serviceClient
        .from("whatsapp_sessions")
        .update({ qr_code: evolutionData.base64, status: "qr_pending" })
        .eq("id", sessionId);
    }

    return new Response(JSON.stringify({
      qr_code: evolutionData?.base64 || session.qr_code,
      status: instanceStatus,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("get-whatsapp-qr error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
