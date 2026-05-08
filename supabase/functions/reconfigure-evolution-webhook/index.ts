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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
    if (!profile) return new Response(JSON.stringify({ error: "No profile" }), { status: 404, headers: corsHeaders });

    const { session_id } = await req.json();
    if (!session_id) return new Response(JSON.stringify({ error: "session_id required" }), { status: 400, headers: corsHeaders });

    const { data: session } = await supabase
      .from("whatsapp_sessions")
      .select("*")
      .eq("id", session_id)
      .eq("tenant_id", profile.tenant_id)
      .single();
    if (!session) return new Response(JSON.stringify({ error: "Session not found" }), { status: 404, headers: corsHeaders });

    const { data: settings } = await supabase
      .from("whatsapp_settings")
      .select("evolution_api_url, evolution_api_key")
      .eq("tenant_id", profile.tenant_id)
      .single();

    const evolutionUrl = settings?.evolution_api_url || Deno.env.get("EVOLUTION_API_URL");
    const evolutionKey = settings?.evolution_api_key || Deno.env.get("EVOLUTION_API_KEY");
    if (!evolutionUrl || !evolutionKey) {
      return new Response(JSON.stringify({ error: "Evolution API not configured" }), { status: 400, headers: corsHeaders });
    }

    const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/whatsapp-evolution-webhook`;
    const events = ["QRCODE_UPDATED", "CONNECTION_UPDATE", "MESSAGES_UPSERT", "SEND_MESSAGE"];

    const attempts: any[] = [];

    // Tentativa 1: formato v2 (webhook envelope)
    try {
      const r1 = await fetch(`${evolutionUrl}/webhook/set/${session.evolution_instance_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: evolutionKey },
        body: JSON.stringify({ webhook: { enabled: true, url: webhookUrl, byEvents: false, base64: true, events } }),
      });
      attempts.push({ format: "v2", status: r1.status, body: (await r1.text()).substring(0, 500) });
    } catch (e: any) {
      attempts.push({ format: "v2", error: e.message });
    }

    // Tentativa 2: formato v1 plano
    try {
      const r2 = await fetch(`${evolutionUrl}/webhook/set/${session.evolution_instance_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: evolutionKey },
        body: JSON.stringify({ enabled: true, url: webhookUrl, webhookByEvents: false, webhookBase64: true, events }),
      });
      attempts.push({ format: "v1", status: r2.status, body: (await r2.text()).substring(0, 500) });
    } catch (e: any) {
      attempts.push({ format: "v1", error: e.message });
    }

    // Verificar config atual
    let current: any = null;
    try {
      const rf = await fetch(`${evolutionUrl}/webhook/find/${session.evolution_instance_id}`, {
        headers: { apikey: evolutionKey },
      });
      current = await rf.json();
    } catch (e) { /* ignore */ }

    return new Response(JSON.stringify({ ok: true, webhook_url: webhookUrl, attempts, current }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("reconfigure-evolution-webhook error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
