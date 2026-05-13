import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Cron-invoked. Protected by shared secret header `x-cron-secret`.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const reqId = crypto.randomUUID();
  try {
    const expected = Deno.env.get("GOVERNANCE_CRON_SECRET");
    const provided = req.headers.get("x-cron-secret");
    if (!expected || provided !== expected) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: due } = await admin
      .from("data_deletion_requests")
      .select("id, tenant_id, audit_snapshot")
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString());

    const results: Array<{ id: string; ok: boolean; error?: string }> = [];

    for (const item of due ?? []) {
      await admin.from("data_deletion_requests").update({ status: "processing" }).eq("id", item.id);
      try {
        await admin.from("audit_logs").insert({
          tenant_id: item.tenant_id,
          action: "deletion_executed",
          entity: "data_deletion_requests",
          entity_id: item.id,
          event_type: "governance",
          severity: "critical",
          metadata: { reqId, snapshot: item.audit_snapshot },
        });

        await admin
          .from("data_deletion_requests")
          .update({ status: "completed", executed_at: new Date().toISOString() })
          .eq("id", item.id);

        results.push({ id: item.id, ok: true });
      } catch (e) {
        const msg = (e as Error).message ?? String(e);
        await admin
          .from("data_deletion_requests")
          .update({
            status: "failed",
            error_message: msg,
            audit_snapshot: { ...(item.audit_snapshot ?? {}), error: msg, failed_at: new Date().toISOString() },
          })
          .eq("id", item.id);
        results.push({ id: item.id, ok: false, error: msg });
      }
    }

    // Expire old export rows (file URLs become invalid after expires_at)
    await admin
      .from("data_exports")
      .update({ status: "expired" })
      .lte("expires_at", new Date().toISOString())
      .eq("status", "completed");

    return new Response(JSON.stringify({ ok: true, processed: results.length, results, reqId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[governance-execute-deletion]", reqId, e);
    return new Response(
      JSON.stringify({ error: (e as Error).message ?? String(e), reqId }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
