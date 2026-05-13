import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return j({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const u = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });
    const { data: c } = await u.auth.getClaims(auth.replace("Bearer ", ""));
    if (!c?.claims) return j({ error: "Unauthorized" }, 401);
    const userId = c.claims.sub;

    const a = createClient(SUPABASE_URL, SERVICE);
    const { data: prof } = await a.from("profiles").select("tenant_id").eq("id", userId).single();
    if (!prof?.tenant_id) return j({ error: "No tenant" }, 403);
    const tenantId = prof.tenant_id;

    const { data: roleRow } = await a.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!roleRow) return j({ error: "Forbidden — admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body?.action; // 'cancel' | 'reactivate'
    const reason = body?.reason ?? null;

    const { data: pol } = await a.from("data_governance_policies").select("retention_days").eq("tenant_id", tenantId).maybeSingle();
    const retentionDays = pol?.retention_days ?? 30;

    if (action === "cancel") {
      const cancelledAt = new Date();
      const retentionUntil = new Date(cancelledAt.getTime() + retentionDays * 86400_000);
      await a.from("tenants").update({
        status: "cancelled",
        cancelled_at: cancelledAt.toISOString(),
        retention_until: retentionUntil.toISOString(),
        deletion_scheduled_at: retentionUntil.toISOString(),
        deletion_status: "pending_retention",
        deletion_reason: reason,
      }).eq("id", tenantId);

      await a.from("audit_logs").insert({
        tenant_id: tenantId,
        actor_user_id: userId,
        action: "account.cancelled",
        entity: "tenants",
        entity_id: tenantId,
        event_type: "governance",
        severity: "critical",
        metadata: { reason, retention_until: retentionUntil.toISOString() },
      });

      return j({ ok: true, retention_until: retentionUntil.toISOString() });
    }

    if (action === "reactivate") {
      await a.from("tenants").update({
        status: "active",
        cancelled_at: null,
        retention_until: null,
        deletion_scheduled_at: null,
        deletion_status: "active",
        deletion_reason: null,
      }).eq("id", tenantId);
      await a.from("audit_logs").insert({
        tenant_id: tenantId, actor_user_id: userId,
        action: "account.reactivated", entity: "tenants", entity_id: tenantId,
        event_type: "governance", severity: "warning",
      });
      return j({ ok: true });
    }

    return j({ error: "Invalid action" }, 400);
  } catch (e) {
    return j({ error: String((e as Error).message ?? e) }, 500);
  }
});

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: s });
}
