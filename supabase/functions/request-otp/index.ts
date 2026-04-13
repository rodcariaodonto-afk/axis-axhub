import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    // Validate JWT
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Token inválido" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claimsData.claims.sub;

    // Parse & validate body
    const body = await req.json();
    const { contract_id, signer_email, signer_name } = body;

    if (!contract_id || typeof contract_id !== "string") {
      return new Response(JSON.stringify({ error: "contract_id obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!signer_email || typeof signer_email !== "string" || !signer_email.includes("@")) {
      return new Response(JSON.stringify({ error: "E-mail do signatário inválido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user tenant
    const { data: profile } = await serviceClient.from("profiles").select("tenant_id").eq("id", userId).single();
    if (!profile) {
      return new Response(JSON.stringify({ error: "Perfil não encontrado" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify contract belongs to tenant
    const { data: contract } = await serviceClient
      .from("contracts")
      .select("id, name, tenant_id")
      .eq("id", contract_id)
      .eq("tenant_id", profile.tenant_id)
      .single();

    if (!contract) {
      return new Response(JSON.stringify({ error: "Contrato não encontrado" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Generate OTP (6 digits)
    const otp = String(Math.floor(100000 + Math.random() * 900000));

    // Hash OTP with SHA-256
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(otp));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const otpHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    // Expiration: 15 minutes
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Save audit log entry (service role bypasses RLS)
    const { error: insertErr } = await serviceClient.from("signature_audit_logs").insert({
      tenant_id: profile.tenant_id,
      contract_id,
      signer_email: signer_email.trim().toLowerCase(),
      signer_name: signer_name?.trim() || null,
      otp_hash: otpHash,
      otp_expires_at: expiresAt,
      status: "pending",
    });

    if (insertErr) {
      console.error("Failed to insert audit log:", insertErr);
      return new Response(JSON.stringify({ error: "Erro ao registrar solicitação" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Update contract signer info and status
    await serviceClient.from("contracts").update({
      signer_email: signer_email.trim().toLowerCase(),
      signer_name: signer_name?.trim() || null,
      signature_status: "Pending",
      updated_at: new Date().toISOString(),
    }).eq("id", contract_id);

    // Send OTP via Resend
    if (resendApiKey && lovableApiKey) {
      try {
        const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
        await fetch(`${GATEWAY_URL}/emails`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${lovableApiKey}`,
            "X-Connection-Api-Key": resendApiKey,
          },
          body: JSON.stringify({
            from: "AXIS CRM <onboarding@resend.dev>",
            to: [signer_email.trim()],
            subject: `Código de Assinatura - ${contract.name}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #1a1a2e;">Código de Assinatura Eletrônica</h2>
                <p>Olá${signer_name ? ` ${signer_name}` : ""},</p>
                <p>Você recebeu uma solicitação de assinatura para o contrato:</p>
                <p style="font-weight: bold; color: #333;">${contract.name}</p>
                <div style="background: #f4f4f8; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                  <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a2e;">${otp}</span>
                </div>
                <p style="color: #666; font-size: 14px;">Este código expira em <strong>15 minutos</strong>.</p>
                <p style="color: #666; font-size: 14px;">Se você não solicitou esta assinatura, ignore este e-mail.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="color: #999; font-size: 12px;">Assinatura eletrônica conforme Lei 14.063/2020 — AXIS CRM</p>
              </div>
            `,
          }),
        });
      } catch (emailErr) {
        console.error("Email send error:", emailErr);
        // Don't fail the whole operation — OTP was saved
      }
    } else {
      console.warn("RESEND_API_KEY or LOVABLE_API_KEY not configured — OTP not sent via email");
    }

    return new Response(
      JSON.stringify({ success: true, message: "Código OTP enviado para o e-mail do signatário" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("request-otp error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno ao solicitar OTP" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
