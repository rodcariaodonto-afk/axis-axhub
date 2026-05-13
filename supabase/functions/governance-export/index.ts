import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Tables included in a full export (tenant-scoped)
const DEFAULT_SCOPE = [
  "tenants", "profiles", "user_roles", "user_permissions",
  "accounts", "contacts", "leads", "opportunities", "deals", "activities",
  "pipeline_stages", "sales_pipelines", "opportunity_stages",
  "contracts", "contract_templates", "proposals",
  "customers", "suppliers", "products", "product_categories",
  "warehouses", "stock_movements", "orders", "order_items",
  "purchases", "purchase_orders",
  "receivables", "payables", "bank_accounts", "bank_transactions", "bank_transfers",
  "payment_recurrences", "balance_sheet_entries",
  "campanhas_configuracoes", "campanhas_contatos",
  "whatsapp_sessions", "whatsapp_messages", "whatsapp_contacts",
  "cadences", "cadence_steps",
  "workflows", "workflow_executions", "workflow_waiting_states",
  "forms", "form_responses", "form_response_drafts",
  "internal_conversations", "internal_messages", "internal_conversation_participants",
  "integrations", "webhooks", "api_keys",
  "bi_dashboards", "bi_widgets", "bi_alerts", "bi_alert_logs",
  "audit_logs", "notifications",
  "data_exports", "data_subject_requests", "data_consents",
  "data_governance_policies",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const reqId = crypto.randomUUID();
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: auth } },
    });
    const token = auth.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub;

    const admin = createClient(SUPABASE_URL, SERVICE);

    // Resolve tenant + admin role
    const { data: profile } = await admin
      .from("profiles").select("tenant_id").eq("id", userId).single();
    if (!profile?.tenant_id) return json({ error: "No tenant" }, 403);
    const tenantId = profile.tenant_id;

    const { data: roleRow } = await admin
      .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!roleRow) return json({ error: "Forbidden — admin only" }, 403);

    let scope: string[] = DEFAULT_SCOPE;
    try {
      const body = await req.json();
      if (Array.isArray(body?.scope) && body.scope.length > 0) {
        scope = body.scope.filter((t: string) => DEFAULT_SCOPE.includes(t));
      }
    } catch { /* default */ }

    // Rate limit: 1 active export per hour
    const { count: activeCount } = await admin
      .from("data_exports").select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .gte("created_at", new Date(Date.now() - 3600_000).toISOString())
      .in("status", ["pending", "processing", "completed"]);
    if ((activeCount ?? 0) >= 3) {
      return json({ error: "Limite de exportações por hora atingido" }, 429);
    }

    // Get policy for expiration
    const { data: policy } = await admin
      .from("data_governance_policies").select("export_expiration_hours")
      .eq("tenant_id", tenantId).maybeSingle();
    const expHours = policy?.export_expiration_hours ?? 72;

    // Create export row
    const { data: exportRow, error: insErr } = await admin.from("data_exports").insert({
      tenant_id: tenantId,
      requested_by: userId,
      status: "processing",
      format: "json",
      scope,
      expires_at: new Date(Date.now() + expHours * 3600_000).toISOString(),
      metadata: { req_id: reqId, ip: req.headers.get("x-forwarded-for") },
    }).select().single();
    if (insErr || !exportRow) throw insErr;

    // Collect data
    const payload: Record<string, unknown> = {
      _meta: {
        tenant_id: tenantId,
        exported_at: new Date().toISOString(),
        exported_by: userId,
        export_id: exportRow.id,
        scope,
        note: "Anexos, imagens e mídias foram excluídos. Apenas metadados/URLs são incluídos.",
      },
    };

    let totalRows = 0;
    const errors: Record<string, string> = {};

    for (const table of scope) {
      try {
        const { data, error } = await admin.from(table).select("*").eq("tenant_id", tenantId).limit(50000);
        if (error) {
          errors[table] = error.message;
          payload[table] = [];
        } else {
          payload[table] = data ?? [];
          totalRows += data?.length ?? 0;
        }
      } catch (e) {
        errors[table] = String(e);
        payload[table] = [];
      }
    }

    if (Object.keys(errors).length) (payload._meta as Record<string, unknown>).errors = errors;

    const fileName = `${tenantId}/${exportRow.id}.json`;
    const json_str = JSON.stringify(payload, null, 2);
    const bytes = new TextEncoder().encode(json_str);

    const { error: upErr } = await admin.storage.from("data-exports").upload(fileName, bytes, {
      contentType: "application/json",
      upsert: true,
    });
    if (upErr) throw upErr;

    const { data: signed } = await admin.storage.from("data-exports").createSignedUrl(fileName, expHours * 3600);

    await admin.from("data_exports").update({
      status: "completed",
      file_path: fileName,
      file_url: signed?.signedUrl,
      file_size_bytes: bytes.length,
      completed_at: new Date().toISOString(),
      metadata: { ...(exportRow.metadata as object ?? {}), total_rows: totalRows, table_errors: errors },
    }).eq("id", exportRow.id);

    await admin.from("audit_logs").insert({
      tenant_id: tenantId,
      actor_user_id: userId,
      action: "data.export.completed",
      entity: "data_exports",
      entity_id: exportRow.id,
      event_type: "governance",
      severity: "critical",
      metadata: { scope, total_rows: totalRows, file_size_bytes: bytes.length },
    });

    return json({ ok: true, export_id: exportRow.id, file_url: signed?.signedUrl, total_rows: totalRows });
  } catch (e) {
    console.error("[governance-export]", reqId, e);
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}
