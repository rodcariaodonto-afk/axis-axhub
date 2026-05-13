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
    if (!roleRow) return j({ error: "Forbidden" }, 403);

    // Compute compliance signals
    const checks: Array<{ id: string; label: string; status: "ok" | "warning" | "critical"; details?: string }> = [];

    // Retention policy
    const { data: pol } = await a.from("data_governance_policies").select("*").eq("tenant_id", tenantId).maybeSingle();
    checks.push({
      id: "retention_policy",
      label: "Política de retenção configurada",
      status: pol ? "ok" : "warning",
      details: pol ? `${pol.retention_days} dias` : "Sem política — usando padrão (30 dias)",
    });

    // Tenant status
    const { data: tenant } = await a.from("tenants").select("status,cancelled_at,retention_until").eq("id", tenantId).single();
    checks.push({
      id: "account_status",
      label: "Status da conta",
      status: tenant?.status === "active" ? "ok" : "warning",
      details: tenant?.cancelled_at ? `Cancelada em ${tenant.cancelled_at}` : tenant?.status,
    });

    // Overdue DSRs
    const { count: overdue } = await a.from("data_subject_requests")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId).neq("status", "resolved")
      .lt("due_at", new Date().toISOString());
    checks.push({
      id: "dsr_overdue",
      label: "Pedidos de titulares vencidos",
      status: (overdue ?? 0) === 0 ? "ok" : "critical",
      details: `${overdue ?? 0} vencido(s)`,
    });

    // Elevated permissions
    const { count: admins } = await a.from("user_roles")
      .select("user_id", { count: "exact", head: true })
      .eq("role", "admin");
    checks.push({
      id: "elevated_perms",
      label: "Usuários com permissões elevadas",
      status: (admins ?? 0) <= 5 ? "ok" : "warning",
      details: `${admins ?? 0} administrador(es)`,
    });

    // Active integrations
    const { count: integrations } = await a.from("integrations")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId);
    checks.push({
      id: "integrations",
      label: "Integrações ativas",
      status: "ok",
      details: `${integrations ?? 0} configurada(s)`,
    });

    // Exports last 30d
    const { count: recentExports } = await a.from("data_exports")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .gte("created_at", new Date(Date.now() - 30 * 86400_000).toISOString());
    checks.push({
      id: "exports_30d",
      label: "Exportações últimos 30d",
      status: "ok",
      details: `${recentExports ?? 0} realizada(s)`,
    });

    // Critical events
    const { count: criticalEvents } = await a.from("audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId).eq("severity", "critical")
      .gte("created_at", new Date(Date.now() - 30 * 86400_000).toISOString());
    checks.push({
      id: "critical_events",
      label: "Eventos críticos (30d)",
      status: (criticalEvents ?? 0) < 10 ? "ok" : "warning",
      details: `${criticalEvents ?? 0} registrado(s)`,
    });

    return j({
      tenant_id: tenantId,
      generated_at: new Date().toISOString(),
      checks,
      summary: {
        ok: checks.filter(c => c.status === "ok").length,
        warning: checks.filter(c => c.status === "warning").length,
        critical: checks.filter(c => c.status === "critical").length,
      },
    });
  } catch (e) {
    return j({ error: String((e as Error).message ?? e) }, 500);
  }
});

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: s });
}
