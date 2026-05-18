import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ActionName = "suspend" | "reactivate" | "soft_delete" | "hard_delete";

function isUuid(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const reqId = crypto.randomUUID().slice(0, 8);
  const log = (m: string, e?: unknown) => console.log(`[super-admin-tenant-action ${reqId}] ${m}`, e ?? "");

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) throw new Error("Unauthorized");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: superAdminRow } = await adminClient.from("super_admins").select("user_id").eq("user_id", caller.id).maybeSingle();
    if (!superAdminRow) throw new Error("Apenas super admins podem executar esta acao");

    const body = await req.json().catch(() => ({}));
    const tenant_id = body.tenant_id;
    const action: ActionName = body.action;
    const reason = body.reason;
    const confirm_name = body.confirm_name;

    if (!isUuid(tenant_id)) throw new Error("tenant_id invalido");
    if (!["suspend", "reactivate", "soft_delete", "hard_delete"].includes(action)) {
      throw new Error("action invalida");
    }

    const { data: tenant, error: tErr } = await adminClient
      .from("tenants")
      .select("id, name, is_active, suspended_at, suspended_reason, deleted_at")
      .eq("id", tenant_id)
      .maybeSingle();
    if (tErr) throw new Error(tErr.message);
    if (!tenant) throw new Error("Tenant nao encontrado");

    if (action === "hard_delete") {
      if (!confirm_name || confirm_name !== tenant.name) {
        throw new Error("Confirmacao invalida: nome do tenant nao confere");
      }
      if (!tenant.deleted_at) {
        throw new Error("Hard delete so permitido apos soft_delete. Execute soft_delete antes.");
      }
    }

    const before = { is_active: tenant.is_active, suspended_at: tenant.suspended_at, suspended_reason: tenant.suspended_reason, deleted_at: tenant.deleted_at };
    let after: Record<string, unknown> = {};
    let newStatus = "active";
    let newIsActive = true;
    let severity: "info" | "warning" | "error" = "info";

    if (action === "suspend") {
      if (!tenant.is_active) throw new Error("Tenant ja esta suspenso");
      after = { is_active: false, suspended_at: new Date().toISOString(), suspended_reason: reason ?? null };
      newStatus = "inactive"; newIsActive = false; severity = "warning";
    } else if (action === "reactivate") {
      if (tenant.is_active && !tenant.suspended_at) throw new Error("Tenant ja esta ativo");
      if (tenant.deleted_at) throw new Error("Tenant excluido nao pode ser reativado diretamente. Restaure via SQL.");
      after = { is_active: true, suspended_at: null, suspended_reason: null };
      newStatus = "active"; newIsActive = true; severity = "info";
    } else if (action === "soft_delete") {
      if (tenant.deleted_at) throw new Error("Tenant ja esta excluido");
      after = { is_active: false, suspended_at: new Date().toISOString(), suspended_reason: reason ?? "Soft delete", deleted_at: new Date().toISOString() };
      newStatus = "inactive"; newIsActive = false; severity = "warning";
    } else if (action === "hard_delete") {
      severity = "error";
    }

    let profilesAffected = 0;

    if (action === "hard_delete") {
      const { data: usersInTenant } = await adminClient.from("profiles").select("id").eq("tenant_id", tenant_id);
      const ids = (usersInTenant ?? []).map((p: any) => p.id);
      log(`hard_delete: deletando ${ids.length} auth.users`);

      await adminClient.from("audit_logs").insert({
        tenant_id, actor_user_id: caller.id, action: "SUPER_ADMIN_HARD_DELETE_TENANT",
        entity: "tenant", entity_id: tenant_id, before_json: before, after_json: { deleted: true },
        event_type: "super_admin_action", severity: "error",
        metadata: { super_admin_email: caller.email, users_deleted: ids.length, tenant_name: tenant.name, confirm_name },
      });

      for (const uid of ids) {
        const { error: delErr } = await adminClient.auth.admin.deleteUser(uid);
        if (delErr) log(`falha ao deletar user ${uid}`, delErr);
        else profilesAffected++;
      }

      await adminClient.from("tenants").delete().eq("id", tenant_id);

      return new Response(JSON.stringify({
        success: true, tenant_id, action, users_deleted: profilesAffected,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { error: uErr } = await adminClient.from("tenants").update(after).eq("id", tenant_id);
    if (uErr) throw new Error(uErr.message);

    const { data: ups } = await adminClient.from("profiles")
      .update({ status: newStatus, is_active: newIsActive })
      .eq("tenant_id", tenant_id).select("id");
    profilesAffected = ups?.length ?? 0;

    await adminClient.from("audit_logs").insert({
      tenant_id, actor_user_id: caller.id,
      action: `SUPER_ADMIN_${action.toUpperCase()}_TENANT`,
      entity: "tenant", entity_id: tenant_id,
      before_json: before, after_json: after,
      event_type: "super_admin_action", severity,
      metadata: { super_admin_email: caller.email, profiles_affected: profilesAffected, reason: reason ?? null },
    });

    return new Response(JSON.stringify({
      success: true, tenant_id, action, profiles_affected: profilesAffected, new_state: after,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    log("ERRO", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: msg.includes("super admins") || msg === "Unauthorized" ? 403 : 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
