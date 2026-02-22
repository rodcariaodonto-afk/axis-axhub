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

    // Get session
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

    // Fetch QR from Evolution
    const evolutionRes = await fetch(
      `${evolutionUrl}/instance/connect/${session.evolution_instance_id}`,
      { headers: { apikey: evolutionKey! } }
    );

    const evolutionData = await evolutionRes.json();

    // Update QR in DB
    if (evolutionData?.base64) {
      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await serviceClient
        .from("whatsapp_sessions")
        .update({ qr_code: evolutionData.base64, status: "qr_pending" })
        .eq("id", sessionId);
    }

    return new Response(JSON.stringify({
      qr_code: evolutionData?.base64 || session.qr_code,
      status: session.status,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
