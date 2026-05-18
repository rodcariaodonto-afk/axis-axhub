// =============================================================================
// super-admin-tenant-action
// =============================================================================
// Executa acoes administrativas em tenants pela perspectiva do Super Admin
// (membro da whitelist `public.super_admins`).
//
// Acoes suportadas nesta versao (Fase 3B.1):
// - suspend: bloqueia o tenant e todos os seus usuarios (reversivel)
// - reactivate: reverte suspend (reversivel)
//
// Acoes em fases futuras:
// - soft_delete: marca tenant como deleted_at (reversivel via SQL)
// - hard_delete: DELETE FROM auth.users em cascade (IRREVERSIVEL)
//
// Toda execucao bem-sucedida loga em audit_logs com actor_user_id do super admin.
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ActionName = "suspend" | "reactivate";

interface ActionRequest {
  tenant_id: string;
  action: ActionName;
  reason?: string;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function parseBody(body: unknown): ActionRequest {
  if (typeof body !== "object" || body === null) {
    throw new Error("Body deve ser um objeto JSON");
  }
  const obj = body as Record<string, unknown>;
  if (!isUuid(obj.tenant_id)) throw new Error("tenant_id invalido (UUID esperado)");
  if (obj.action !== "suspend" && obj.action !== "reactivate") {
    throw new Error("action deve ser 'suspend' ou 'reactivate'");
  }
  if (obj.reason !== undefined && typeof obj.reason !== "string") {
    throw new Error("reason deve ser string");
  }
  return {
    tenant_id: obj.tenant_id,
    action: obj.action,
    reason: obj.reason as string | undefined,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const reqId = crypto.randomUUID().slice(0, 8);
  const log = (msg: string, extra?: unknown) =>
    console.log(`[super-admin-tenant-action ${reqId}] ${msg}`, extra ?? "");

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // 1) Identifica o caller via JWT
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) throw new Error("Unauthorized");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // 2) Verifica super admin via RPC (defense in depth - frontend ja filtra,
    // mas o backend NUNCA confia no client)
    const { data: isSuperAdmin, error: isSuperAdminError } = await adminClient.rpc("is_super_admin");
    if (isSuperAdminError) {
      log("rpc is_super_admin error", isSuperAdminError);
      throw new Error("Falha ao verificar permissoes");
    }
    // Importante: o RPC `is_super_admin()` usa auth.uid() do JWT enviado,
    // mas com adminClient (service_role), auth.uid() vira NULL.
    // Entao precisamos verificar via SELECT direto.
    const { data: superAdminRow } = await adminClient
      .from("super_admins")
      .select("user_id")
      .eq("user_id", caller.id)
      .maybeSingle();

    if (!superAdminRow) {
      log("caller NAO eh super admin", { caller_id: caller.id });
      throw new Error("Apenas super admins podem executar esta acao");
    }

    log("super admin autenticado", { caller_id: caller.id, email: caller.email });

    // 3) Parse e valida body
    const rawBody = await req.json().catch(() => ({}));
    const { tenant_id, action, reason } = parseBody(rawBody);
    log("acao recebida", { tenant_id, action, reason });

    // 4) Busca tenant alvo (estado atual para before_json)
    const { data: tenant, error: tenantError } = await adminClient
      .from("tenants")
      .select("id, name, is_active, suspended_at, suspended_reason")
      .eq("id", tenant_id)
      .maybeSingle();

    if (tenantError) throw new Error(`Erro ao buscar tenant: ${tenantError.message}`);
    if (!tenant) throw new Error("Tenant nao encontrado");

    const beforeTenant = {
      is_active: tenant.is_active,
      suspended_at: tenant.suspended_at,
      suspended_reason: tenant.suspended_reason,
    };

    // 5) Determina novos valores
    let afterTenant: Record<string, unknown>;
    let newProfileStatus: string;
    let newProfileIsActive: boolean;

    if (action === "suspend") {
      if (!tenant.is_active) {
        throw new Error("Tenant ja esta suspenso");
      }
      afterTenant = {
        is_active: false,
        suspended_at: new Date().toISOString(),
        suspended_reason: reason ?? null,
      };
      newProfileStatus = "inactive";
      newProfileIsActive = false;
    } else {
      // reactivate
      if (tenant.is_active && !tenant.suspended_at) {
        throw new Error("Tenant ja esta ativo");
      }
      afterTenant = {
        is_active: true,
        suspended_at: null,
        suspended_reason: null,
      };
      newProfileStatus = "active";
      newProfileIsActive = true;
    }

    // 6) Atualiza tenant
    const { error: updateTenantError } = await adminClient
      .from("tenants")
      .update(afterTenant)
      .eq("id", tenant_id);
    if (updateTenantError) throw new Error(`Erro ao atualizar tenant: ${updateTenantError.message}`);

    log("tenant atualizado", afterTenant);

    // 7) Atualiza profiles do tenant (bloqueia/desbloqueia login)
    const { data: updatedProfiles, error: updateProfilesError } = await adminClient
      .from("profiles")
      .update({ status: newProfileStatus, is_active: newProfileIsActive })
      .eq("tenant_id", tenant_id)
      .select("id");
    if (updateProfilesError) {
      log("erro ao atualizar profiles", updateProfilesError);
      // nao aborta - tenant ja foi atualizado, profiles seguem em estado intermediario.
      // o super admin pode rodar de novo para corrigir.
    }
    const profilesAffected = updatedProfiles?.length ?? 0;
    log("profiles atualizados", { count: profilesAffected, status: newProfileStatus });

    // 8) Log em audit_logs
    const { error: auditError } = await adminClient.from("audit_logs").insert({
      tenant_id,
      actor_user_id: caller.id,
      action: `SUPER_ADMIN_${action.toUpperCase()}_TENANT`,
      entity: "tenant",
      entity_id: tenant_id,
      before_json: beforeTenant,
      after_json: afterTenant,
      event_type: "super_admin_action",
      severity: action === "suspend" ? "warning" : "info",
      metadata: {
        super_admin_email: caller.email,
        profiles_affected: profilesAffected,
        reason: reason ?? null,
      },
    });
    if (auditError) {
      log("WARNING: falha ao escrever audit_log", auditError);
      // nao aborta - acao ja foi executada
    }

    return new Response(
      JSON.stringify({
        success: true,
        tenant_id,
        action,
        profiles_affected: profilesAffected,
        new_state: afterTenant,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    log("ERRO", msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      {
        status: msg === "Unauthorized" || msg.includes("super admins") ? 403 : 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
