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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { workflow_id, trigger_data = {}, trigger_type = "manual" } = await req.json();
    if (!workflow_id) return new Response(JSON.stringify({ error: "workflow_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Load workflow
    const { data: workflow, error: wfErr } = await supabase.from("workflows").select("*").eq("id", workflow_id).single();
    if (wfErr || !workflow) return new Response(JSON.stringify({ error: "Workflow not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const definition = workflow.definition as WorkflowDefinition;
    const tenantId = workflow.tenant_id;

    // Create execution record
    const { data: execution, error: execErr } = await supabase.from("workflow_executions").insert({
      workflow_id, tenant_id: tenantId, trigger_type, trigger_data, status: "running",
    }).select("id").single();
    if (execErr || !execution) throw new Error("Failed to create execution: " + execErr?.message);

    const executionId = execution.id;
    const sortedNodes = [...definition.nodes].sort((a, b) => a.position - b.position);
    const startTime = Date.now();
    let failed = false;
    let errorMsg = "";

    for (const node of sortedNodes) {
      if (node.type === "trigger") continue; // Skip trigger nodes (already triggered)

      const stepStart = Date.now();
      await supabase.from("workflow_execution_steps").insert({
        execution_id: executionId, tenant_id: tenantId, node_id: node.id,
        node_type: node.type, status: "running", input_data: { catalogId: node.catalogId, ...node.config, trigger_data },
      });

      try {
        if (node.type === "condition") {
          const passed = evaluateCondition(node, trigger_data);
          if (!passed) {
            await supabase.from("workflow_execution_steps").update({
              status: "skipped", output_data: { result: "condition_not_met" },
              completed_at: new Date().toISOString(), duration_ms: Date.now() - stepStart,
            }).eq("execution_id", executionId).eq("node_id", node.id);
            break; // Stop execution if condition fails
          }
          await supabase.from("workflow_execution_steps").update({
            status: "completed", output_data: { result: "condition_met" },
            completed_at: new Date().toISOString(), duration_ms: Date.now() - stepStart,
          }).eq("execution_id", executionId).eq("node_id", node.id);
          continue;
        }

        // Execute action
        const result = await executeAction(supabase, tenantId, node, trigger_data, workflow.created_by);
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
      ...(failed ? { error_message: errorMsg } : { result: { steps: sortedNodes.length } }),
    }).eq("id", executionId);

    // Update workflow counters
    const counterField = failed ? "failed_executions" : "successful_executions";
    await supabase.rpc("", {}).catch(() => {}); // fallback
    await supabase.from("workflows").update({
      total_executions: (workflow.total_executions || 0) + 1,
      [counterField]: (workflow[counterField as keyof typeof workflow] as number || 0) + 1,
    }).eq("id", workflow_id);

    return new Response(JSON.stringify({ execution_id: executionId, status: finalStatus, duration_ms: totalMs }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: errMessage }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function evaluateCondition(node: WorkflowNode, triggerData: Record<string, unknown>): boolean {
  const field = String(node.config.field || "");
  const value = node.config.value;
  const operator = String(node.config.operator || node.catalogId);
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

  switch (node.catalogId) {
    case "create_notification": {
      const { error } = await supabase.from("notifications").insert({
        tenant_id: tenantId,
        recipient_id: createdBy,
        notification_type_id: "workflow_automation",
        title: String(config.title || "Workflow"),
        message: String(config.message || ""),
        priority: String(config.priority || "normal"),
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
      const { error } = await supabase.from("activities").insert({
        tenant_id: tenantId,
        title: String(config.title || "Tarefa do workflow"),
        type: String(config.type || "task"),
        description: String(config.description || ""),
        owner_user_id: createdBy,
        lead_id: triggerData.lead_id as string || null,
        deal_id: triggerData.deal_id as string || null,
      });
      if (error) throw new Error("Create activity error: " + error.message);
      return { action: "activity_created" };
    }

    case "add_tag": {
      const leadId = triggerData.lead_id || triggerData.id;
      if (!leadId) return { action: "skipped", reason: "no_lead_id" };
      const { data: lead } = await supabase.from("leads").select("tags").eq("id", leadId).single();
      const currentTags = (lead?.tags || []) as string[];
      const newTag = String(config.tag);
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
      // Placeholder: in real implementation, this would schedule a delayed continuation
      return { action: "delay_placeholder", minutes: config.minutes };
    }

    case "create_task": {
      const { error } = await supabase.from("activities").insert({
        tenant_id: tenantId,
        title: String(config.title || "Tarefa"),
        type: "task",
        description: String(config.description || ""),
        owner_user_id: createdBy,
      });
      if (error) throw new Error("Create task error: " + error.message);
      return { action: "task_created" };
    }

    default:
      return { action: "unknown", catalogId: node.catalogId };
  }
}
