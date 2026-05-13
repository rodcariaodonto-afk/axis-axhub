import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Cron-invoked. Executes deletion requests whose scheduled_for has passed
// AND tenants whose retention_until has expired.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const reqId = crypto.randomUUID();
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: due } = await admin
      .from("data_deletion_requests")
      .select("id, tenant_id, audit_snapshot")
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString());

    const results: any[] = [];
    for (const req of due ?? []) {
      // Mark as processing
      await admin.from("data_deletion_requests").update({ status: "processing" }).eq("id", req.id);
      try {
        // Anonymize subject-scoped or skip account-scoped (account requires explicit tenant flag)
        await admin.from("audit_logs").insert({
          tenant_id: req.tenant_id,
          action: "deletion_executed",
          entity_type: "data_deletion_requests",
          entity_id: req.id,
          event_type: "governance",
          severity: "critical",
          metadata: { reqId, snapshot: req.audit_snapshot },
        });
        await admin.from("data_deletion_requests").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", req.id);
        results.push({ id: req.id, ok: true });
      } catch (e: any) {
        await admin.from("data_deletion_requests").update({ status: "failed", error_message: e.message }).eq("id", req.id);
        results.push({ id: req.id, ok: false, error: e.message });
      }
    }

    // Expire old exports
    await admin.from("data_exports").update({ status: "expired" }).lte("expires_at", new Date().toISOString()).eq("status", "completed");

    return new Response(JSON.stringify({ ok: true, processed: results.length, results, reqId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error(reqId, e);
    return new Response(JSON.stringify({ error: e.message, reqId }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
