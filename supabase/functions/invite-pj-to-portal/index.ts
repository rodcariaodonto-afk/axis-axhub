import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl  = Deno.env.get("SUPABASE_URL")!;
  const serviceKey   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey      = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Verify caller via their JWT
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Não autorizado" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user: caller } } = await callerClient.auth.getUser();
  if (!caller) {
    return new Response(JSON.stringify({ error: "Não autorizado" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const adminClient = createClient(supabaseUrl, serviceKey);

  // Caller must be admin
  const { data: isAdmin } = await adminClient.rpc("has_role", { _user_id: caller.id, _role: "admin" });
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "Apenas administradores podem convidar PJs" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { pj_id, email, access_level = "view" } = body as {
      pj_id: string;
      email: string;
      access_level?: string;
    };

    // Validate email
    if (!email || !EMAIL_RE.test(email)) {
      return new Response(JSON.stringify({ error: "E-mail inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!pj_id) {
      return new Response(JSON.stringify({ error: "pj_id é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get caller's tenant
    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("tenant_id")
      .eq("id", caller.id)
      .single();
    if (!callerProfile?.tenant_id) {
      return new Response(JSON.stringify({ error: "Perfil do administrador não encontrado" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const tenant_id = callerProfile.tenant_id as string;

    // Validate pj_id exists and is a pj_provider
    const { data: account, error: accountErr } = await adminClient
      .from("crm_accounts")
      .select("id, name, account_type")
      .eq("id", pj_id)
      .eq("tenant_id", tenant_id)
      .eq("is_active", true)
      .single();

    if (accountErr || !account) {
      return new Response(JSON.stringify({ error: "PJ não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if ((account as any).account_type !== "pj_provider") {
      return new Response(JSON.stringify({ error: "A conta não é do tipo Prestador PJ" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists in auth (via profiles table)
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    let userId: string;
    let isNewUser: boolean;

    if (existingProfile) {
      userId = (existingProfile as any).id as string;
      isNewUser = false;
    } else {
      // Create new user via invite — sends magic-link email automatically
      const { data: inviteData, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(normalizedEmail);
      if (inviteErr) {
        console.error("[invite-pj-to-portal] invite error:", inviteErr);
        return new Response(JSON.stringify({ error: `Erro ao convidar usuário: ${inviteErr.message}` }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = inviteData.user.id;
      isNewUser = true;
    }

    // Check if pj_portal_access already exists for this user + tenant + pj
    const { data: existing } = await adminClient
      .from("pj_portal_access" as any)
      .select("id")
      .eq("user_id", userId)
      .eq("tenant_id", tenant_id)
      .eq("pj_id", pj_id)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: "Este email já tem acesso ao portal para este Prestador PJ" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create pj_portal_access
    const { data: portalAccess, error: accessErr } = await adminClient
      .from("pj_portal_access" as any)
      .insert({ tenant_id, pj_id, user_id: userId, access_level })
      .select("id")
      .single();

    if (accessErr) {
      console.error("[invite-pj-to-portal] access insert error:", accessErr);
      return new Response(JSON.stringify({ error: "Erro ao criar acesso ao portal" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create welcome notification for the PJ
    await adminClient.from("pj_notifications" as any).insert({
      tenant_id,
      pj_id,
      type: "portal_convite",
      title: "Bem-vindo ao Portal",
      message: "Você recebeu acesso ao portal de prestadores. Faça login para visualizar contratos, repasses, documentos e notas fiscais.",
      is_read: false,
    });

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        portal_access_id: (portalAccess as any).id,
        is_new_user: isNewUser,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[invite-pj-to-portal]", err);
    return new Response(JSON.stringify({ error: err.message ?? "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
