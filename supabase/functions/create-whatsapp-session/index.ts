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

    // Get tenant
    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", userId).single();
    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), { status: 404, headers: corsHeaders });
    }
    const tenantId = profile.tenant_id;

    const { session_name } = await req.json();
    if (!session_name) {
      return new Response(JSON.stringify({ error: "session_name is required" }), { status: 400, headers: corsHeaders });
    }

    // Get Evolution API settings
    const { data: settings } = await supabase
      .from("whatsapp_settings")
      .select("evolution_api_url, evolution_api_key")
      .eq("tenant_id", tenantId)
      .single();

    const evolutionUrl = settings?.evolution_api_url || Deno.env.get("EVOLUTION_API_URL");
    const evolutionKey = settings?.evolution_api_key || Deno.env.get("EVOLUTION_API_KEY");

    if (!evolutionUrl || !evolutionKey) {
      return new Response(JSON.stringify({ error: "Evolution API not configured" }), { status: 400, headers: corsHeaders });
    }

    // Create instance on Evolution API
    const instanceName = `axhub_${tenantId.substring(0, 8)}_${Date.now()}`;
    const evolutionRes = await fetch(`${evolutionUrl}/instance/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: evolutionKey },
      body: JSON.stringify({
        instanceName,
        integration: "WHATSAPP-BAILEYS",
        qrcode: true,
      }),
    });

    const evolutionData = await evolutionRes.json();
    if (!evolutionRes.ok) {
      return new Response(JSON.stringify({ error: "Evolution API error", details: evolutionData }), { status: 502, headers: corsHeaders });
    }

    // Save session
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: session, error: insertError } = await serviceClient
      .from("whatsapp_sessions")
      .insert({
        tenant_id: tenantId,
        session_name,
        status: "qr_pending",
        evolution_instance_id: instanceName,
        qr_code: evolutionData?.qrcode?.base64 || null,
      })
      .select()
      .single();

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ session, qrcode: evolutionData?.qrcode }), { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
