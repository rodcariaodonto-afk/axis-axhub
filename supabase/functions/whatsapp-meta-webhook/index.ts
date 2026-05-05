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

  // Disparar workflows (ou resume) — try/catch isolado: erro aqui não afeta save da mensagem
  try {
    await dispatchWorkflowsOrResume({
      tenantId: connection.tenant_id,
      connectionId: connection.id,
      phone: from,
      messageText: content,
      messageId: msg.id,
      serviceClient,
    });
  } catch (e) {
    console.error("[workflow-dispatch] failed, continuing:", e);
  }
}

async function integrateCRM(
  phone: string,
  content: string,
  connection: any,
  serviceClient: any,
  timestamp: string
) {
  try {
    // Resolver contato/lead via helper (compartilhado com dispatchWorkflowsOrResume)
    const { contactId, contactName: resolvedName } = await resolveContactByPhone(
      phone,
      connection.tenant_id,
      serviceClient
    );
    const contactName = resolvedName || phone;

    // Atualizar updated_at do contato se encontrado
    if (contactId) {
      await serviceClient
        .from("contacts")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", contactId);
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

// ── Helper: resolve contato/lead por phone (compartilhado entre integrateCRM e dispatch) ──
async function resolveContactByPhone(
  phone: string,
  tenantId: string,
  serviceClient: any
): Promise<{ contactId: string | null; leadId: string | null; contactName: string | null }> {
  const digits = phone.replace(/\D/g, "");
  const phoneVariants = [phone, digits, `+${digits}`];

  // Tentar contacts primeiro
  const { data: contacts } = await serviceClient
    .from("contacts")
    .select("id, first_name, last_name")
    .eq("tenant_id", tenantId)
    .or(phoneVariants.map((p) => `phone.eq.${p}`).join(","))
    .limit(1);

  if (contacts && contacts.length > 0) {
    const c = contacts[0];
    return {
      contactId: c.id,
      leadId: null,
      contactName: `${c.first_name} ${c.last_name || ""}`.trim() || null,
    };
  }

  // Fallback: leads
  const { data: leads } = await serviceClient
    .from("leads")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .or(phoneVariants.map((p) => `phone.eq.${p}`).join(","))
    .limit(1);

  if (leads && leads.length > 0) {
    return {
      contactId: null,
      leadId: leads[0].id,
      contactName: leads[0].name || null,
    };
  }

  return { contactId: null, leadId: null, contactName: null };
}

// ── Disparar workflows ou retomar execução pausada ──
async function dispatchWorkflowsOrResume(params: {
  tenantId: string;
  connectionId: string;
  phone: string;
  messageText: string;
  messageId: string;
  serviceClient: any;
}) {
  const { tenantId, connectionId, phone, messageText, messageId, serviceClient } = params;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // ── 1. Verificar workflow_waiting_states ativo (resume) ──
  const { data: waiting } = await serviceClient
    .from("workflow_waiting_states")
    .select("execution_id")
    .eq("tenant_id", tenantId)
    .eq("phone", phone)
    .eq("provider", "meta")
    .eq("status", "waiting")
    .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
    .limit(1);

  if (waiting && waiting.length > 0) {
    const executionId = waiting[0].execution_id;
    console.log("[workflow-dispatch] resume execution:", executionId);

    const res = await fetch(`${supabaseUrl}/functions/v1/workflow-runner`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceRoleKey}` },
      body: JSON.stringify({ resume_execution_id: executionId, whatsapp_reply: messageText }),
    });
    if (!res.ok) console.error("[workflow-dispatch] resume failed:", await res.text());
    return;
  }

  // ── 2. Resolver contact/lead para enriquecer triggerData ──
  const { contactId, leadId } = await resolveContactByPhone(phone, tenantId, serviceClient);

  // ── 3. Buscar workflows publicados com trigger compativel ──
  const { data: workflows } = await serviceClient
    .from("workflows")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .eq("is_published", true)
    .eq("is_active", true)
    .contains("trigger_types", ["whatsapp.message_received"]);

  if (!workflows || workflows.length === 0) {
    console.log("[workflow-dispatch] no workflows for tenant:", tenantId);
    return;
  }

  console.log("[workflow-dispatch] dispatching", workflows.length, "workflows for", phone);

  // ── 4. Disparar cada workflow (em paralelo, sem aguardar) ──
  const triggerData = {
    phone,
    message_text: messageText,
    provider: "meta",
    connection_id: connectionId,
    contact_id: contactId,
    lead_id: leadId,
    message_id: messageId,
    tenant_id: tenantId,
  };

  await Promise.all(
    workflows.map(async (wf: any) => {
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/workflow-runner`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceRoleKey}` },
          body: JSON.stringify({
            workflow_id: wf.id,
            trigger_type: "whatsapp.message_received",
            trigger_data: triggerData,
          }),
        });
        if (!res.ok) {
          console.error(`[workflow-dispatch] workflow ${wf.id} (${wf.name}) failed:`, await res.text());
        }
      } catch (e) {
        console.error(`[workflow-dispatch] workflow ${wf.id} fetch error:`, e);
      }
    })
  );
}
