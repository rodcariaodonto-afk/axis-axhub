import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function testMetaConnection(phoneNumberId: string, accessToken: string) {
  const res = await fetch(
    `https://graph.facebook.com/v18.0/${phoneNumberId}?fields=display_phone_number,verified_name&access_token=${accessToken}`
  );
  const data = await res.json();
  if (!res.ok) return { valid: false, error: data.error?.message || "Credenciais inválidas" };
  return { valid: true, phoneNumber: data.display_phone_number };
}

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

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub;

    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", userId).single();
    if (!profile) return new Response(JSON.stringify({ error: "Profile not found" }), { status: 404, headers: corsHeaders });
    const tenantId = profile.tenant_id;

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const connectionId = pathParts[pathParts.length - 1];
    const isUUID = /^[0-9a-f-]{36}$/.test(connectionId);

    // GET — listar conexões
    if (req.method === "GET" && !isUUID) {
      const { data, error } = await supabase
        .from("whatsapp_meta_connections")
        .select("id, name, phone_number_id, waba_id, phone_number, webhook_url, webhook_verify_token, status, is_active, created_at")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // GET — detalhe
    if (req.method === "GET" && isUUID) {
      const { data, error } = await supabase
        .from("whatsapp_meta_connections")
        .select("id, name, phone_number_id, waba_id, phone_number, webhook_url, webhook_verify_token, status, is_active, last_error, created_at")
        .eq("id", connectionId)
        .eq("tenant_id", tenantId)
        .single();
      if (error || !data) return new Response(JSON.stringify({ error: "Não encontrado" }), { status: 404, headers: corsHeaders });
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // POST — criar conexão
    if (req.method === "POST") {
      const { name, phone_number_id, waba_id, access_token } = await req.json();
      if (!name || !phone_number_id || !waba_id || !access_token) {
        return new Response(JSON.stringify({ error: "Campos obrigatórios: name, phone_number_id, waba_id, access_token" }), { status: 400, headers: corsHeaders });
      }

      const test = await testMetaConnection(phone_number_id, access_token);
      if (!test.valid) {
        return new Response(JSON.stringify({ error: `Credenciais inválidas: ${test.error}` }), { status: 400, headers: corsHeaders });
      }

      const verifyToken = crypto.randomUUID();
      const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/whatsapp-meta-webhook`;

      const { data, error } = await serviceClient
        .from("whatsapp_meta_connections")
        .insert({
          tenant_id: tenantId,
          user_id: userId,
          name,
          phone_number_id,
          waba_id,
          access_token,
          phone_number: test.phoneNumber,
          webhook_url: webhookUrl,
          webhook_verify_token: verifyToken,
          status: "connected",
          is_active: true,
        })
        .select("id, name, phone_number, webhook_url, webhook_verify_token, status, created_at")
        .single();

      if (error) throw error;
      return new Response(JSON.stringify(data), { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // PUT — atualizar
    if (req.method === "PUT" && isUUID) {
      const body = await req.json();
      const updates: Record<string, unknown> = {};
      if (body.name) updates.name = body.name;
      if (body.access_token) {
        const test = await testMetaConnection(body.phone_number_id || "", body.access_token);
        if (!test.valid) return new Response(JSON.stringify({ error: test.error }), { status: 400, headers: corsHeaders });
        updates.access_token = body.access_token;
        updates.phone_number = test.phoneNumber;
        updates.status = "connected";
      }
      const { data, error } = await serviceClient
        .from("whatsapp_meta_connections")
        .update(updates)
        .eq("id", connectionId)
        .eq("tenant_id", tenantId)
        .select("id, name, status")
        .single();
      if (error) throw error;
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // DELETE — soft delete
    if (req.method === "DELETE" && isUUID) {
      await serviceClient
        .from("whatsapp_meta_connections")
        .update({ is_active: false, status: "disconnected" })
        .eq("id", connectionId)
        .eq("tenant_id", tenantId);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });

  } catch (err) {
    console.error("whatsapp-meta-connections error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
