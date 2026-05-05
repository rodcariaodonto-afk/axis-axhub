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
    let payload: any;
    try {
      payload = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "invalid_json" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!payload || payload.object !== "whatsapp_business_account") {
      return new Response(JSON.stringify({ error: "invalid_payload", expected: "whatsapp_business_account" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    processPayload(payload, serviceClient).catch((err) => {
      console.error("processPayload error:", err);
    });

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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

// Helper compartilhado: resolve contato/lead pelo telefone
async function resolveContactByPhone(
  phone: string,
  tenantId: string,
  serviceClient: any
): Promise<{ contactId: string | null; contactName: string; leadId: string | null }> {
  const digits = phone.replace(/\D/g, "");
  const phoneVariants = [phone, digits, `+${digits}`];

  let contactId: string | null = null;
  let leadId: string | null = null;
  let contactName = phone;

  const { data: contacts } = await serviceClient
    .from("contacts")
    .select("id, first_name, last_name, phone")
    .eq("tenant_id", tenantId)
    .or(phoneVariants.map((p) => `phone.eq.${p}`).join(","))
    .limit(1);

  if (contacts && contacts.length > 0) {
    contactId = contacts[0].id;
    contactName = `${contacts[0].first_name} ${contacts[0].last_name || ""}`.trim();
  } else {
    const { data: leads } = await serviceClient
      .from("leads")
      .select("id, name, phone")
      .eq("tenant_id", tenantId)
      .or(phoneVariants.map((p) => `phone.eq.${p}`).join(","))
      .limit(1);

    if (leads && leads.length > 0) {
      leadId = leads[0].id;
      contactName = leads[0].name || phone;
    }
  }

  return { contactId, contactName, leadId };
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

  // Resolver contato uma vez (compartilhado entre CRM e dispatch)
  const resolved = await resolveContactByPhone(from, connection.tenant_id, serviceClient);

  // Integração CRM
  await integrateCRM(from, content, connection, serviceClient, timestamp, resolved);

  // Dispatch de workflows / resume — isolado, não afeta save
  try {
    await dispatchWorkflowsOrResume(from, connection, serviceClient, {
      message_id: msg.id,
      content,
      message_type: msg.type,
      timestamp,
      contact_id: resolved.contactId,
      lead_id: resolved.leadId,
      contact_name: resolved.contactName,
      provider: "meta",
    });
  } catch (err) {
    console.error("dispatchWorkflowsOrResume error:", err);
  }
}

async function integrateCRM(
  phone: string,
  content: string,
  connection: any,
  serviceClient: any,
  timestamp: string,
  resolved: { contactId: string | null; contactName: string; leadId: string | null }
) {
  try {
    const { contactId, contactName } = resolved;

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

// Dispatcher: resume workflows aguardando OU dispara novos workflows triggerados por mensagem
async function dispatchWorkflowsOrResume(
  phone: string,
  connection: any,
  serviceClient: any,
  triggerData: any
) {
  const tenantId = connection.tenant_id;

  // 1. Procurar workflow_waiting_states pendentes para esse telefone
  const { data: waiting } = await serviceClient
    .from("workflow_waiting_states")
    .select("id, execution_id, workflow_id, node_id")
    .eq("tenant_id", tenantId)
    .eq("status", "waiting")
    .eq("wait_phone", phone)
    .limit(5);

  const runnerUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/workflow-runner`;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (waiting && waiting.length > 0) {
    for (const w of waiting) {
      console.log("Resuming workflow execution:", w.execution_id);
      fetch(runnerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          resume_execution_id: w.execution_id,
          resume_node_id: w.node_id,
          trigger_data: triggerData,
        }),
      }).catch((e) => console.error("resume invoke error:", e));
    }
    return; // Se houve resume, não dispara novos
  }

  // 2. Não há resume: buscar workflows publicados com trigger 'whatsapp.message_received'
  const { data: workflows } = await serviceClient
    .from("workflows")
    .select("id, trigger_type, trigger_config")
    .eq("tenant_id", tenantId)
    .eq("status", "published")
    .eq("trigger_type", "whatsapp.message_received");

  if (!workflows || workflows.length === 0) return;

  for (const wf of workflows) {
    console.log("Dispatching workflow:", wf.id, "for phone:", phone);
    fetch(runnerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        workflow_id: wf.id,
        trigger_data: triggerData,
      }),
    }).catch((e) => console.error("dispatch invoke error:", e));
  }
}
