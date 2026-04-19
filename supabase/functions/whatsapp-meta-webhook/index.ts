import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // GET — verificação do webhook pela Meta (challenge)
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token) {
      const { data } = await serviceClient
        .from("whatsapp_meta_connections")
        .select("id")
        .eq("webhook_verify_token", token)
        .eq("is_active", true)
        .limit(1);

      if (data && data.length > 0) {
        console.log("Webhook verificado com sucesso");
        return new Response(challenge, { status: 200 });
      }
    }
    return new Response("Verification failed", { status: 403 });
  }

  // POST — receber mensagens/eventos
  if (req.method === "POST") {
    const payload = await req.json();

    processPayload(payload, serviceClient).catch((err) => {
      console.error("processPayload error:", err);
    });

    return new Response("OK", { status: 200 });
  }

  return new Response("Method not allowed", { status: 405 });
});

async function processPayload(payload: any, serviceClient: any) {
  if (payload.object !== "whatsapp_business_account") return;

  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== "messages") continue;

      const value = change.value;
      const phoneNumberId = value.metadata?.phone_number_id;

      // Buscar conexão pelo phone_number_id
      const { data: connection } = await serviceClient
        .from("whatsapp_meta_connections")
        .select("id, tenant_id")
        .eq("phone_number_id", phoneNumberId)
        .eq("is_active", true)
        .limit(1)
        .single();

      if (!connection) {
        console.warn("Conexão não encontrada para phone_number_id:", phoneNumberId);
        continue;
      }

      // Processar mensagens recebidas
      for (const msg of value.messages || []) {
        await processMessage(msg, connection, serviceClient);
      }

      // Atualizar status de mensagens enviadas
      for (const status of value.statuses || []) {
        await serviceClient
          .from("whatsapp_meta_messages")
          .update({
            status: status.status,
            error_message: status.errors?.map((e: any) => `${e.code}: ${e.title}`).join("; ") || null,
          })
          .eq("message_id", status.id);
      }
    }
  }
}

async function processMessage(msg: any, connection: any, serviceClient: any) {
  const from = `+${msg.from}`;

  // Idempotência
  const { data: existing } = await serviceClient
    .from("whatsapp_meta_messages")
    .select("id")
    .eq("message_id", msg.id)
    .single();
  if (existing) return;

  // Extrair conteúdo
  let content = "";
  switch (msg.type) {
    case "text": content = msg.text?.body || ""; break;
    case "image": content = msg.image?.caption || "[Imagem]"; break;
    case "audio": content = "[Áudio]"; break;
    case "video": content = msg.video?.caption || "[Vídeo]"; break;
    case "document": content = `[Documento: ${msg.document?.filename || "arquivo"}]`; break;
    default: content = `[${msg.type}]`;
  }

  const timestamp = new Date(parseInt(msg.timestamp) * 1000).toISOString();

  // Salvar mensagem
  await serviceClient.from("whatsapp_meta_messages").insert({
    connection_id: connection.id,
    tenant_id: connection.tenant_id,
    message_id: msg.id,
    phone_number: from,
    message_type: msg.type,
    message_content: content,
    direction: "inbound",
    status: "delivered",
    meta_timestamp: timestamp,
  });

  console.log("Mensagem inbound salva:", msg.id, "de", from);

  // Integração CRM — buscar contato pelo número
  await integrateCRM(from, content, connection, serviceClient, timestamp);
}

async function integrateCRM(
  phone: string,
  content: string,
  connection: any,
  serviceClient: any,
  timestamp: string
) {
  try {
    // Normalizar número para busca (com e sem +55)
    const digits = phone.replace(/\D/g, "");
    const phoneVariants = [phone, digits, `+${digits}`];

    // Buscar contato pelo número
    let contactId: string | null = null;
    let contactName = phone;

    const { data: contacts } = await serviceClient
      .from("contacts")
      .select("id, first_name, last_name, phone")
      .eq("tenant_id", connection.tenant_id)
      .or(phoneVariants.map((p) => `phone.eq.${p}`).join(","))
      .limit(1);

    if (contacts && contacts.length > 0) {
      contactId = contacts[0].id;
      contactName = `${contacts[0].first_name} ${contacts[0].last_name || ""}`.trim();

      // Atualizar last_contacted_at se a coluna existir
      await serviceClient
        .from("contacts")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", contactId);
    } else {
      // Buscar em leads
      const { data: leads } = await serviceClient
        .from("leads")
        .select("id, name, phone")
        .eq("tenant_id", connection.tenant_id)
        .or(phoneVariants.map((p) => `phone.eq.${p}`).join(","))
        .limit(1);

      if (leads && leads.length > 0) {
        contactName = leads[0].name || phone;
      }
    }

    // Buscar tipo de atividade WhatsApp ou usar padrão
    const { data: activityTypes } = await serviceClient
      .from("activity_types")
      .select("name")
      .eq("tenant_id", connection.tenant_id)
      .ilike("name", "%whatsapp%")
      .limit(1);

    const activityType = activityTypes?.[0]?.name || "Task";

    // Truncar conteúdo para título
    const title = content.length > 80 ? content.substring(0, 80) + "..." : content;

    // Criar atividade no CRM
    await serviceClient.from("activities").insert({
      tenant_id: connection.tenant_id,
      type: activityType,
      title: `WhatsApp Meta: ${title}`,
      description: `Mensagem recebida de ${contactName} (${phone}) via WhatsApp Cloud API.\n\nConteúdo: ${content}`,
      status: "Completed",
      contact_id: contactId,
      done_at: timestamp,
      created_at: timestamp,
      is_active: true,
    });

    console.log("Atividade CRM criada para:", phone, "contato:", contactId);
  } catch (err) {
    console.error("integrateCRM error:", err);
  }
}
