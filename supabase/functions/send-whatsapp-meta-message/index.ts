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

async function sendMessage(phoneNumberId: string, accessToken: string, to: string, body: any) {
  const res = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to, ...body }),
  });
  const data = await res.json();
  if (!res.ok) return { success: false, error: data.error?.message || "Erro desconhecido" };
  return { success: true, messageId: data.messages?.[0]?.id };
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

    const payload = await req.json();
    const { connection_id, message_type = "text", message_content, template_name, language_code = "pt_BR", media_url, media_type, file_name, _action, recipients } = payload;

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

    // DISPARO EM MASSA
    if (_action === "bulk" && Array.isArray(recipients)) {
      if (recipients.length > 1000) {
        return new Response(JSON.stringify({ error: "Máximo de 1.000 destinatários" }), { status: 400, headers: corsHeaders });
      }

      const results = [];
      const BATCH_SIZE = 10;

      for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
        const batch = recipients.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(async (phone: string) => {
          const to = normalizePhone(phone);
          let msgBody: any;

          if (message_type === "template") {
            msgBody = { type: "template", template: { name: template_name, language: { code: language_code } } };
          } else {
            msgBody = { type: "text", text: { body: message_content } };
          }

          const result = await sendMessage(conn.phone_number_id, conn.access_token, to, msgBody);

          await serviceClient.from("whatsapp_meta_messages").insert({
            connection_id,
            tenant_id: tenantId,
            message_id: result.messageId,
            phone_number: to,
            message_type,
            message_content: message_content || template_name,
            direction: "outbound",
            status: result.success ? "sent" : "failed",
            error_message: result.error || null,
          });

          return { phone: to, success: result.success, error: result.error };
        });

        const batchResults = await Promise.allSettled(batchPromises);
        batchResults.forEach((r) => {
          if (r.status === "fulfilled") results.push(r.value);
          else results.push({ phone: "", success: false, error: r.reason?.message });
        });

        if (i + BATCH_SIZE < recipients.length) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      const successCount = results.filter((r) => r.success).length;
      return new Response(
        JSON.stringify({ total: recipients.length, sent: successCount, failed: recipients.length - successCount, results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ENVIO INDIVIDUAL
    const { phone_number } = payload;
    if (!phone_number) {
      return new Response(JSON.stringify({ error: "phone_number é obrigatório" }), { status: 400, headers: corsHeaders });
    }

    const to = normalizePhone(phone_number);
    let msgBody: any;

    if (message_type === "text") {
      msgBody = { type: "text", text: { body: message_content } };
    } else if (message_type === "template") {
      msgBody = { type: "template", template: { name: template_name, language: { code: language_code } } };
    } else if (message_type === "media") {
      const mt = media_type || "image";
      const mediaPayload: any = { link: media_url };
      // Meta only allows captions on image, video and document
      if ((mt === "image" || mt === "video" || mt === "document") && message_content) {
        mediaPayload.caption = message_content;
      }
      if (mt === "document") {
        mediaPayload.filename = file_name || "document";
      }
      msgBody = { type: mt, [mt]: mediaPayload };
    } else {
      return new Response(JSON.stringify({ error: `message_type inválido: ${message_type}` }), { status: 400, headers: corsHeaders });
    }

    const result = await sendMessage(conn.phone_number_id, conn.access_token, to, msgBody);

    const storedType = message_type === "media" ? (media_type || "image") : message_type;
    const storedContent = message_type === "media"
      ? JSON.stringify({ url: media_url, caption: message_content || "" })
      : (message_content || template_name || "");

    await serviceClient.from("whatsapp_meta_messages").insert({
      connection_id,
      tenant_id: tenantId,
      message_id: result.messageId,
      phone_number: to,
      message_type: storedType,
      message_content: storedContent,
      media_url: media_url || null,
      direction: "outbound",
      status: result.success ? "sent" : "failed",
      error_message: result.error || null,
    });

    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error }), { status: 502, headers: corsHeaders });
    }

    return new Response(
      JSON.stringify({ success: true, message_id: result.messageId, status: "sent", timestamp: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("send-whatsapp-meta-message error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
