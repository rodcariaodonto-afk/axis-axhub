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

    // Parse body
    const { contract_id, otp_code } = await req.json();

    if (!contract_id || typeof contract_id !== "string") {
      return new Response(JSON.stringify({ error: "contract_id obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!otp_code || typeof otp_code !== "string" || otp_code.length !== 6) {
      return new Response(JSON.stringify({ error: "Código OTP inválido (6 dígitos)" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Capture IP and User-Agent from request
    const ipAddress = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user tenant
    const { data: profile } = await serviceClient.from("profiles").select("tenant_id").eq("id", userId).single();
    if (!profile) {
      return new Response(JSON.stringify({ error: "Perfil não encontrado" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Hash the provided OTP
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(otp_code));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const otpHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    // Find matching pending audit log
    const { data: auditLog, error: alErr } = await serviceClient
      .from("signature_audit_logs")
      .select("*")
      .eq("contract_id", contract_id)
      .eq("tenant_id", profile.tenant_id)
      .eq("otp_hash", otpHash)
      .eq("status", "pending")
      .eq("otp_verified", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (alErr || !auditLog) {
      // Log failed attempt
      await serviceClient.from("signature_audit_logs").insert({
        tenant_id: profile.tenant_id,
        contract_id,
        signer_email: "unknown",
        status: "failed",
        ip_address: ipAddress,
        user_agent: userAgent,
      });

      return new Response(
        JSON.stringify({ error: "Código OTP inválido ou já utilizado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiration
    if (new Date(auditLog.otp_expires_at) < new Date()) {
      await serviceClient
        .from("signature_audit_logs")
        .update({ status: "expired", ip_address: ipAddress, user_agent: userAgent })
        .eq("id", auditLog.id);

      return new Response(
        JSON.stringify({ error: "Código OTP expirado. Solicite um novo código." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // OTP is valid — mark as verified
    const signedAt = new Date().toISOString();
    await serviceClient
      .from("signature_audit_logs")
      .update({
        otp_verified: true,
        status: "verified",
        ip_address: ipAddress,
        user_agent: userAgent,
        signed_at: signedAt,
      })
      .eq("id", auditLog.id);

    // Update contract status
    await serviceClient.from("contracts").update({
      signature_status: "Signed",
      signed_at: signedAt,
      signed_by_id: userId,
      updated_at: signedAt,
    }).eq("id", contract_id);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Contrato assinado com sucesso",
        audit: {
          signer_email: auditLog.signer_email,
          signer_name: auditLog.signer_name,
          signed_at: signedAt,
          ip_address: ipAddress,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("verify-and-sign error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno ao verificar assinatura" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
