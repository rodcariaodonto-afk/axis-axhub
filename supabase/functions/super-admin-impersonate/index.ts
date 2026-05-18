import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const reqId = crypto.randomUUID().slice(0, 8);
  const log = (m: string, e?: unknown) => console.log(`[super-admin-impersonate ${reqId}] ${m}`, e ?? "");

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

    const { user_id, reason } = await req.json();
    if (!user_id || typeof user_id !== "string") throw new Error("user_id invalido");
    if (user_id === caller.id) throw new Error("Voce nao pode impersonar a si mesmo");

    const { data: profile } = await adminClient.from("profiles").select("email, tenant_id, full_name").eq("id", user_id).maybeSingle();
    if (!profile?.email) throw new Error("Usuario nao encontrado");

    log("AUDITORIA ANTES de gerar link", { target: profile.email, caller: caller.email });

    await adminClient.from("audit_logs").insert({
      tenant_id: profile.tenant_id,
      actor_user_id: caller.id,
      action: "SUPER_ADMIN_IMPERSONATE",
      entity: "user",
      entity_id: user_id,
      event_type: "super_admin_action",
      severity: "warning",
      metadata: {
        super_admin_email: caller.email,
        target_email: profile.email,
        target_name: profile.full_name,
        reason: reason ?? null,
      },
    });

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: profile.email,
    });
    if (linkError) throw new Error(`Erro ao gerar magic link: ${linkError.message}`);

    return new Response(
      JSON.stringify({
        success: true,
        target_email: profile.email,
        target_name: profile.full_name,
        magic_link: linkData?.properties?.action_link ?? null,
        warning: "Abra este link em aba anonima para nao deslogar sua conta de super admin. Todas as acoes na sessao impersonada sao gravadas em audit_logs com seu actor_user_id.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    log("ERRO", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: msg.includes("super admins") || msg === "Unauthorized" ? 403 : 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
