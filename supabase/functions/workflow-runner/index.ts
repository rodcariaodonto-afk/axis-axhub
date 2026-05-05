import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WorkflowNode {
  id: string;
  type: "trigger" | "action" | "condition";
  catalogId: string;
  config: Record<string, string | number>;
  position: number;
}

interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: { source: string; target: string; condition?: string }[];
}

function resolveTemplate(text: unknown, triggerData: Record<string, unknown>): string {
  if (typeof text !== "string") return String(text ?? "");
  return text.replace(/\{\{(\s*[\w.]+\s*)\}\}/g, (_, key) => {
    const val = triggerData[key.trim()];
    return val !== undefined && val !== null ? String(val) : "";
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const payload = await req.json();

    // ── Resume flow ──
    if (payload.resume_execution_id) {
      return await handleResume(supabase, payload);
    }

    // ── Normal execution flow ──
    const { workflow_id, trigger_data = {}, trigger_type = "manual" } = payload;
    if (!workflow_id) return new Response(JSON.stringify({ error: "workflow_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: workflow, error: wfErr } = await supabase.from("workflows").select("*").eq("id", workflow_id).single();
    if (wfErr || !workflow) return new Response(JSON.stringify({ error: "Workflow not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const definition = workflow.definition as WorkflowDefinition;
    const tenantId = workflow.tenant_id;

    const { data: execution, error: execErr } = await supabase.from("workflow_executions").insert({
      workflow_id, tenant_id: tenantId, trigger_type, trigger_data, status: "running",
    }).select("id").single();
    if (execErr || !execution) throw new Error("Failed to create execution: " + execErr?.message);

    const executionId = execution.id;
    const sortedNodes = [...definition.nodes].sort((a, b) => a.position - b.position);

    const result = await executeNodes(supabase, sortedNodes, 0, executionId, tenantId, trigger_data, workflow, workflow_id);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: errMessage }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ── Resume a paused workflow ──
async function handleResume(supabase: ReturnType<typeof createClient>, payload: Record<string, unknown>) {
  const { resume_execution_id, whatsapp_reply } = payload;

  const { data: waitState, error: wsErr } = await supabase
    .from("workflow_waiting_states")
    .select("*")
    .eq("execution_id", resume_execution_id)
    .eq("status", "waiting")
    .single();

  if (wsErr || !waitState) {
    return new Response(JSON.stringify({ error: "No waiting state found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Mark as resumed
  await supabase.from("workflow_waiting_states").update({ status: "resumed" }).eq("id", waitState.id);

  // Update execution back to running
  await supabase.from("workflow_executions").update({ status: "running" }).eq("id", resume_execution_id);

  // Load workflow
  const { data: workflow } = await supabase.from("workflows").select("*").eq("id", waitState.workflow_id).single();
  if (!workflow) {
    return new Response(JSON.stringify({ error: "Workflow not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Load existing trigger_data and inject reply
  const { data: exec } = await supabase.from("workflow_executions").select("trigger_data").eq("id", resume_execution_id).single();
  const triggerData = { ...(exec?.trigger_data as Record<string, unknown> || {}), whatsapp_reply: String(whatsapp_reply || "") };

  // Update trigger_data with reply
  await supabase.from("workflow_executions").update({ trigger_data: triggerData }).eq("id", resume_execution_id);

  const remainingNodes = waitState.remaining_nodes as WorkflowNode[];

  const result = await executeNodes(supabase, remainingNodes, 0, resume_execution_id as string, waitState.tenant_id, triggerData, workflow, waitState.workflow_id);

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Core execution loop ──
async function executeNodes(
  supabase: ReturnType<typeof createClient>,
  nodes: WorkflowNode[],
  startIndex: number,
  executionId: string,
  tenantId: string,
  triggerData: Record<string, unknown>,
  workflow: Record<string, unknown>,
  workflowId: string,
) {
  const startTime = Date.now();
  let failed = false;
  let errorMsg = "";

  for (let i = startIndex; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.type === "trigger") continue;

    const stepStart = Date.now();
    await supabase.from("workflow_execution_steps").insert({
      execution_id: executionId, tenant_id: tenantId, node_id: node.id,
      node_type: node.type, status: "running", input_data: { catalogId: node.catalogId, ...node.config, trigger_data: triggerData },
    });

    try {
      // ── Wait for WhatsApp reply (pause execution) ──
      if (node.catalogId === "wait_for_whatsapp_reply") {
        const r = (val: unknown) => resolveTemplate(val, triggerData);
        const phone = r(node.config.phone);
        const sessionId = r(node.config.session_id) || null;
        const timeoutMin = Number(node.config.timeout_minutes) || 0;

        const remainingNodes = nodes.slice(i + 1);

        await supabase.from("workflow_waiting_states").insert({
          tenant_id: tenantId,
          execution_id: executionId,
          workflow_id: workflowId,
          node_id: node.id,
          session_id: sessionId || null,
          phone,
          remaining_nodes: remainingNodes,
          expires_at: timeoutMin > 0 ? new Date(Date.now() + timeoutMin * 60000).toISOString() : null,
          provider: String((node.config as Record<string, unknown>).provider || "evolution"),
        });

        await supabase.from("workflow_execution_steps").update({
          status: "waiting", output_data: { action: "waiting_for_reply", phone },
          completed_at: new Date().toISOString(), duration_ms: Date.now() - stepStart,
        }).eq("execution_id", executionId).eq("node_id", node.id);

        await supabase.from("workflow_executions").update({ status: "waiting" }).eq("id", executionId);

        return { execution_id: executionId, status: "waiting", waiting_for: phone, duration_ms: Date.now() - startTime };
      }

      // ── Special async condition: whatsapp_first_message_in_window ──
      // Verifica se é a primeira mensagem inbound do contato dentro de window_days
      // Async porque precisa fazer query no banco — diferente das conditions sincronas em evaluateCondition
      if (node.type === "condition" && node.catalogId === "whatsapp_first_message_in_window") {
        const phone = String(triggerData.phone || "");
        const windowDays = Number(node.config.window_days) || 30;

        let passed = false;
        if (phone) {
          const cutoff = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
          const { count, error: cntErr } = await supabase
            .from("whatsapp_meta_messages")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", tenantId)
            .eq("phone_number", phone)
            .eq("direction", "inbound")
            .gte("created_at", cutoff);

          if (cntErr) {
            throw new Error("first_message condition error: " + cntErr.message);
          }
          // count <= 1 = primeira mensagem na janela (a propria mensagem do trigger ja conta)
          passed = (count ?? 0) <= 1;
        }

        if (!passed) {
          await supabase.from("workflow_execution_steps").update({
            status: "skipped", output_data: { result: "condition_not_met", phone, window_days: windowDays },
            completed_at: new Date().toISOString(), duration_ms: Date.now() - stepStart,
          }).eq("execution_id", executionId).eq("node_id", node.id);
          break;
        }
        await supabase.from("workflow_execution_steps").update({
          status: "completed", output_data: { result: "condition_met", phone, window_days: windowDays },
          completed_at: new Date().toISOString(), duration_ms: Date.now() - stepStart,
        }).eq("execution_id", executionId).eq("node_id", node.id);
        continue;
      }

      if (node.type === "condition") {
        const passed = evaluateCondition(node, triggerData);
        if (!passed) {
          await supabase.from("workflow_execution_steps").update({
            status: "skipped", output_data: { result: "condition_not_met" },
            completed_at: new Date().toISOString(), duration_ms: Date.now() - stepStart,
          }).eq("execution_id", executionId).eq("node_id", node.id);
          break;
        }
        await supabase.from("workflow_execution_steps").update({
          status: "completed", output_data: { result: "condition_met" },
          completed_at: new Date().toISOString(), duration_ms: Date.now() - stepStart,
        }).eq("execution_id", executionId).eq("node_id", node.id);
        continue;
      }

      const result = await executeAction(supabase, tenantId, node, triggerData, workflow.created_by as string);
      await supabase.from("workflow_execution_steps").update({
        status: "completed", output_data: result,
        completed_at: new Date().toISOString(), duration_ms: Date.now() - stepStart,
      }).eq("execution_id", executionId).eq("node_id", node.id);

    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : String(err);
      failed = true;
      errorMsg = errMessage;
      await supabase.from("workflow_execution_steps").update({
        status: "failed", error_message: errMessage,
        completed_at: new Date().toISOString(), duration_ms: Date.now() - stepStart,
      }).eq("execution_id", executionId).eq("node_id", node.id);
      break;
    }
  }

  const totalMs = Date.now() - startTime;
  const finalStatus = failed ? "failed" : "completed";

  await supabase.from("workflow_executions").update({
    status: finalStatus, completed_at: new Date().toISOString(), duration_ms: totalMs,
    ...(failed ? { error_message: errorMsg } : { result: { steps: nodes.length } }),
  }).eq("id", executionId);

  // Update workflow counters
  const counterField = failed ? "failed_executions" : "successful_executions";
  await supabase.from("workflows").update({
    total_executions: ((workflow.total_executions as number) || 0) + 1,
    [counterField]: ((workflow[counterField] as number) || 0) + 1,
  }).eq("id", workflowId);

  return { execution_id: executionId, status: finalStatus, duration_ms: totalMs };
}

function evaluateCondition(node: WorkflowNode, triggerData: Record<string, unknown>): boolean {
  const field = String(node.config.field || "");
  const value = node.config.value;
  const operator = String(node.config.operator || node.catalogId);

  // Special: whatsapp_reply_contains checks the whatsapp_reply field
  if (node.catalogId === "whatsapp_reply_contains") {
    const reply = String(triggerData.whatsapp_reply || "");
    const searchVal = String(value || "");
    const caseSensitive = String(node.config.case_sensitive) === "true";
    if (caseSensitive) return reply.includes(searchVal);
    return reply.toLowerCase().includes(searchVal.toLowerCase());
  }

  const fieldValue = triggerData[field];

  switch (operator) {
    case "field_equals": return String(fieldValue) === String(value);
    case "field_contains": return String(fieldValue || "").includes(String(value));
    case "field_greater_than": return Number(fieldValue) > Number(value);
    case "field_empty":
      if (node.config.operator === "empty") return !fieldValue || String(fieldValue) === "";
      return !!fieldValue && String(fieldValue) !== "";
    default: return true;
  }
}

async function executeAction(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  node: WorkflowNode,
  triggerData: Record<string, unknown>,
  createdBy: string,
): Promise<Record<string, unknown>> {
  const config = node.config;
  const r = (val: unknown) => resolveTemplate(val, triggerData);

  switch (node.catalogId) {
    // ──── WhatsApp Send Actions ────

    case "send_whatsapp_message":
    case "send_whatsapp_text": {
      const provider = String(r(config.provider) || "evolution");
      const phone = r(config.phone);
      const message = r(config.message);
      if (!phone || !message) return { action: "skipped", reason: "missing_fields" };

      // ── Meta Cloud API: chamada direta (auth da Edge Function send-whatsapp-meta-message exige JWT de user) ──
      if (provider === "meta") {
        const connectionId = r(config.connection_id);
        if (!connectionId) return { action: "skipped", reason: "missing_connection_id" };

        // Buscar credenciais da conexao Meta
        const { data: conn, error: connErr } = await supabase
          .from("whatsapp_meta_connections")
          .select("phone_number_id, access_token")
          .eq("id", connectionId)
          .eq("tenant_id", tenantId)
          .eq("is_active", true)
          .single();
        if (connErr || !conn) throw new Error("Meta connection not found or inactive: " + (connErr?.message || connectionId));

        // Normalizar telefone para E.164
        const digits = phone.replace(/\D/g, "");
        const to = digits.startsWith("55") && digits.length >= 12 ? `+${digits}`
                 : (digits.length === 11 || digits.length === 10) ? `+55${digits}`
                 : `+${digits}`;

        // Chamar Meta Cloud API direto
        const metaRes = await fetch(`https://graph.facebook.com/v18.0/${conn.phone_number_id}/messages`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${conn.access_token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to,
            type: "text",
            text: { body: message },
          }),
        });
        const metaBody = await metaRes.json().catch(() => ({}));
        if (!metaRes.ok) throw new Error("Meta send error: " + JSON.stringify(metaBody));
        return { action: "whatsapp_text_sent", provider: "meta", phone: to, message_id: metaBody?.messages?.[0]?.id };
      }

      // ── Evolution API: comportamento existente (regressao zero) ──
      const sessionId = r(config.session_id);
      if (!sessionId) return { action: "skipped", reason: "missing_session_id" };

      const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-whatsapp-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
        body: JSON.stringify({ session_id: sessionId, phone, message, tenant_id: tenantId }),
      });
      const resBody = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error("WhatsApp send error: " + JSON.stringify(resBody));
      return { action: "whatsapp_text_sent", provider: "evolution", phone, status: res.status };
    }

    case "send_whatsapp_image": {
      const sessionId = r(config.session_id);
      const phone = r(config.phone);
      const imageUrl = r(config.image_url);
      const caption = r(config.caption) || "";
      if (!sessionId || !phone || !imageUrl) return { action: "skipped", reason: "missing_fields" };

      const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-whatsapp-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
        body: JSON.stringify({ session_id: sessionId, phone, media_url: imageUrl, media_type: "image", caption, tenant_id: tenantId }),
      });
      if (!res.ok) throw new Error("WhatsApp image error: " + (await res.text()));
      return { action: "whatsapp_image_sent", phone };
    }

    case "send_whatsapp_document": {
      const sessionId = r(config.session_id);
      const phone = r(config.phone);
      const docUrl = r(config.document_url);
      const filename = r(config.filename) || "document";
      if (!sessionId || !phone || !docUrl) return { action: "skipped", reason: "missing_fields" };

      const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-whatsapp-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
        body: JSON.stringify({ session_id: sessionId, phone, media_url: docUrl, media_type: "document", filename, tenant_id: tenantId }),
      });
      if (!res.ok) throw new Error("WhatsApp doc error: " + (await res.text()));
      return { action: "whatsapp_document_sent", phone };
    }

    case "send_whatsapp_audio": {
      const sessionId = r(config.session_id);
      const phone = r(config.phone);
      const audioUrl = r(config.audio_url);
      if (!sessionId || !phone || !audioUrl) return { action: "skipped", reason: "missing_fields" };

      const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-whatsapp-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
        body: JSON.stringify({ session_id: sessionId, phone, media_url: audioUrl, media_type: "audio", tenant_id: tenantId }),
      });
      if (!res.ok) throw new Error("WhatsApp audio error: " + (await res.text()));
      return { action: "whatsapp_audio_sent", phone };
    }

    // ──── CRM Actions ────

    case "create_lead": {
      const name = r(config.name) || r(config.lead_name) || triggerData.respondent_name || "Lead do Workflow";
      const email = r(config.email) || triggerData.respondent_email || null;
      const phone = r(config.phone) || triggerData.respondent_phone || null;
      const source = r(config.source) || "workflow";
      const { data, error } = await supabase.from("leads").insert({
        tenant_id: tenantId, name, email, phone, source,
        status: r(config.status) || "new",
        owner_user_id: createdBy,
      }).select("id").single();
      if (error) throw new Error("Create lead error: " + error.message);
      return { action: "lead_created", lead_id: data.id };
    }

    case "create_account": {
      const name = r(config.name) || r(config.account_name) || triggerData.institution_name || "Conta do Workflow";
      const segment = r(config.segment) || r(config.industry) || null;
      const { data, error } = await supabase.from("crm_accounts").insert({
        tenant_id: tenantId, name, segment,
      }).select("id").single();
      if (error) throw new Error("Create account error: " + error.message);
      return { action: "account_created", account_id: data.id };
    }

    case "create_contact": {
      const fullName = r(config.name) || triggerData.respondent_name || "";
      const parts = String(fullName).split(" ");
      const firstName = r(config.first_name) || parts[0] || "Contato";
      const lastName = r(config.last_name) || parts.slice(1).join(" ") || null;
      const email = r(config.email) || triggerData.respondent_email || null;
      const { data, error } = await supabase.from("contacts").insert({
        tenant_id: tenantId, first_name: firstName, last_name: lastName, email,
        phone: r(config.phone) || triggerData.respondent_phone || null,
        account_id: r(config.account_id) || null,
      }).select("id").single();
      if (error) throw new Error("Create contact error: " + error.message);
      return { action: "contact_created", contact_id: data.id };
    }

    case "create_opportunity": {
      const name = r(config.name) || r(config.opportunity_name) || "Oportunidade do Workflow";
      const amount = Number(r(config.amount) || triggerData.estimated_value || 0);
      const { data: stageData } = await supabase.from("opportunity_stages")
        .select("name").eq("tenant_id", tenantId).order("order_index", { ascending: true }).limit(1).single();
      const stageName = stageData?.name || "Prospecting";
      const { data, error } = await supabase.from("opportunities").insert({
        tenant_id: tenantId, name, amount, stage: stageName,
        owner_id: createdBy,
      }).select("id").single();
      if (error) throw new Error("Create opportunity error: " + error.message);
      return { action: "opportunity_created", opportunity_id: data.id };
    }

    case "send_email": {
      const to = r(config.to) || triggerData.respondent_email;
      if (!to) return { action: "skipped", reason: "no_recipient_email" };
      const subject = r(config.subject) || "Notificação";
      const body = r(config.body) || r(config.message) || "";
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (!resendKey) return { action: "skipped", reason: "RESEND_API_KEY_not_configured" };

      // Try with configured from address, fallback to onboarding@resend.dev if domain not verified
      const fromAddress = r(config.from) || "Axis CRM <noreply@axhub.com.br>";
      
      let res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: fromAddress,
          to: [String(to)],
          subject,
          html: `<div style="font-family:Arial,sans-serif;padding:20px;">${body.replace(/\n/g, "<br>")}</div>`,
        }),
      });
      
      // If domain not verified (403/422), retry with Resend default sender
      if (!res.ok) {
        const errBody = await res.text();
        console.warn(`Resend error with ${fromAddress}: ${errBody}. Retrying with default sender...`);
        
        res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "Axis CRM <onboarding@resend.dev>",
            to: [String(to)],
            subject,
            html: `<div style="font-family:Arial,sans-serif;padding:20px;">${body.replace(/\n/g, "<br>")}</div>`,
          }),
        });
        
        if (!res.ok) {
          const retryErr = await res.text();
          throw new Error("Resend error (fallback): " + retryErr);
        }
        return { action: "email_sent", to, subject, fallback_sender: true };
      }
      return { action: "email_sent", to, subject };
    }

    // ──── Existing Actions ────

    case "create_notification": {
      const { error } = await supabase.from("notifications").insert({
        tenant_id: tenantId,
        recipient_id: createdBy,
        notification_type_id: "workflow_automation",
        title: r(config.title) || "Workflow",
        message: r(config.message) || "",
        priority: r(config.priority) || "normal",
      });
      if (error) throw new Error("Notification error: " + error.message);
      return { action: "notification_created" };
    }

    case "update_lead_field": {
      const leadId = triggerData.lead_id || triggerData.id;
      if (!leadId) return { action: "skipped", reason: "no_lead_id" };
      const { error } = await supabase.from("leads").update({ [String(config.field)]: config.value }).eq("id", leadId);
      if (error) throw new Error("Update lead error: " + error.message);
      return { action: "lead_updated", field: config.field, value: config.value };
    }

    case "move_deal_stage": {
      const dealId = triggerData.deal_id || triggerData.id;
      if (!dealId) return { action: "skipped", reason: "no_deal_id" };
      const { data: stage } = await supabase.from("pipeline_stages").select("id").eq("tenant_id", tenantId).ilike("name", String(config.stage_name)).single();
      if (!stage) return { action: "skipped", reason: "stage_not_found" };
      const { error } = await supabase.from("deals").update({ stage_id: stage.id }).eq("id", dealId);
      if (error) throw new Error("Move deal error: " + error.message);
      return { action: "deal_moved", stage_id: stage.id };
    }

    case "create_activity": {
      const assignedTo = r(config.assigned_to_user_id);
      const { error } = await supabase.from("activities").insert({
        tenant_id: tenantId,
        title: r(config.title) || "Tarefa do workflow",
        type: r(config.type) || "task",
        description: r(config.description) || "",
        owner_user_id: assignedTo || createdBy,
        lead_id: triggerData.lead_id as string || null,
        deal_id: triggerData.deal_id as string || null,
        contact_id: triggerData.contact_id as string || null,
      });
      if (error) throw new Error("Create activity error: " + error.message);
      return { action: "activity_created", assigned_to: assignedTo || createdBy };
    }

    case "add_tag": {
      const leadId = triggerData.lead_id || triggerData.id;
      if (!leadId) return { action: "skipped", reason: "no_lead_id" };
      const { data: lead } = await supabase.from("leads").select("tags").eq("id", leadId).single();
      const currentTags = (lead?.tags || []) as string[];
      const newTag = r(config.tag);
      if (!currentTags.includes(newTag)) {
        const { error } = await supabase.from("leads").update({ tags: [...currentTags, newTag] }).eq("id", leadId);
        if (error) throw new Error("Add tag error: " + error.message);
      }
      return { action: "tag_added", tag: newTag };
    }

    case "send_webhook": {
      const res = await fetch(String(config.url), {
        method: String(config.method || "POST"),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflow_data: triggerData, tenant_id: tenantId }),
      });
      return { action: "webhook_sent", status: res.status, ok: res.ok };
    }

    case "delay": {
      return { action: "delay_placeholder", minutes: config.minutes };
    }

    case "create_task": {
      const { error } = await supabase.from("activities").insert({
        tenant_id: tenantId,
        title: r(config.title) || "Tarefa",
        type: "task",
        description: r(config.description) || "",
        owner_user_id: createdBy,
      });
      if (error) throw new Error("Create task error: " + error.message);
      return { action: "task_created" };
    }

    default:
      return { action: "unknown", catalogId: node.catalogId };
  }
}
