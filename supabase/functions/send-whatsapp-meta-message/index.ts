import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return `+${digits}`;
  if (digits.length === 11 || digits.length === 10) return `+55${digits}`;
  return `+${digits}`;
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

    const { connection_id, phone_number, message_type = "text", message_content, template_name, language_code = "pt_BR", media_url, media_type } = await req.json();

    if (!connection_id || !phone_number) {
      return new Response(JSON.stringify({ error: "connection_id e phone_number são obrigatórios" }), { status: 400, headers: corsHeaders });
    }

    // Buscar conexão
    const { data: conn, error: connError } = await supabase
      .from("whatsapp_meta_connections")
      .select("*")
      .eq("id", connection_id)
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .single();

    if (connError || !conn) {
      return new Response(JSON.stringify({ error: "Conexão não encontrada ou inativa" }), { status: 404, headers: corsHeaders });
    }

    const to = normalizePhone(phone_number);
    let body: any = { messaging_product: "whatsapp", recipient_type: "individual", to };

    if (message_type === "text") {
      body.type = "text";
      body.text = { body: message_content };
    } else if (message_type === "template") {
      body.type = "template";
      body.template = { name: template_name, language: { code: language_code } };
    } else if (message_type === "media") {
      body.type = media_type || "image";
      body[media_type || "image"] = { link: media_url, caption: message_content || "" };
    } else {
      return new Response(JSON.stringify({ error: `message_type inválido: ${message_type}` }), { status: 400, headers: corsHeaders });
    }

    // Enviar via Meta Graph API
    const metaRes = await fetch(
      `https://graph.facebook.com/v18.0/${conn.phone_number_id}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${conn.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const metaData = await metaRes.json();

    if (!metaRes.ok) {
      // Salvar como failed
      await serviceClient.from("whatsapp_meta_messages").insert({
        connection_id,
        tenant_id: tenantId,
        phone_number: to,
        message_type,
        message_content: message_content || template_name,
        direction: "outbound",
        status: "failed",
        error_message: metaData.error?.message || "Erro desconhecido",
      });
      return new Response(JSON.stringify({ error: metaData.error?.message || "Erro ao enviar" }), { status: 502, headers: corsHeaders });
    }

    const messageId = metaData.messages?.[0]?.id;

    // Salvar mensagem enviada
    await serviceClient.from("whatsapp_meta_messages").insert({
      connection_id,
      tenant_id: tenantId,
      message_id: messageId,
      phone_number: to,
      message_type,
      message_content: message_content || template_name,
      media_url: media_url || null,
      direction: "outbound",
      status: "sent",
    });

    return new Response(
      JSON.stringify({ success: true, message_id: messageId, status: "sent", timestamp: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("send-whatsapp-meta-message error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
