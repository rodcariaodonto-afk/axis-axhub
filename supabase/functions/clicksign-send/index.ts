import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import {
  ClicksignClient,
  getClicksignCredentialsForTenant,
} from "../_shared/clicksign-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({
  contract_id: z.string().uuid(),
  signers: z
    .array(
      z.object({
        email: z.string().email(),
        name: z.string().min(1).max(200),
        signing_order: z.number().int().min(1).optional(),
      }),
    )
    .min(1)
    .max(20),
  deadline_at: z.string().datetime().optional(),
  message: z.string().max(500).optional(),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const reqId = crypto.randomUUID();

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Não autorizado" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (claimsErr || !claims?.claims) return json({ error: "Token inválido" }, 401);
    const userId = claims.claims.sub;

    const raw = await req.json();
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
    const { contract_id, signers, deadline_at, message } = parsed.data;

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: profile } = await admin
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .single();
    if (!profile) return json({ error: "Perfil não encontrado" }, 403);
    const tenantId = profile.tenant_id;

    console.log(`[${reqId}] clicksign-send tenant=${tenantId} contract=${contract_id}`);

    const creds = await getClicksignCredentialsForTenant(admin, tenantId);
    if (!creds) {
      return json(
        {
          error:
            "Clicksign não configurado. Vá em Configurações → Integrações e adicione o Access Token.",
        },
        400,
      );
    }

    const { data: contract, error: cErr } = await admin
      .from("contracts")
      .select("id, name, tenant_id, document_url, signature_status, clicksign_document_key")
      .eq("id", contract_id)
      .eq("tenant_id", tenantId)
      .single();
    if (cErr || !contract) return json({ error: "Contrato não encontrado" }, 404);

    if (contract.clicksign_document_key) {
      return json(
        {
          error:
            "Este contrato já foi enviado para Clicksign. Cancele o envio anterior antes de reenviar.",
        },
        400,
      );
    }
    if (!contract.document_url) {
      return json(
        { error: "Gere o PDF do contrato antes de enviar para Clicksign." },
        400,
      );
    }

    // Generate a 7-day signed URL so Clicksign can fetch the PDF
    const { data: signed, error: urlErr } = await admin.storage
      .from("axis-contracts")
      .createSignedUrl(contract.document_url, 7 * 24 * 60 * 60);
    if (urlErr || !signed?.signedUrl) {
      return json({ error: "Falha ao gerar URL temporária do PDF" }, 500);
    }

    const client = new ClicksignClient(creds.token);
    const result = await client.createEnvelope({
      tenant_id: tenantId,
      contract_id,
      file_url: signed.signedUrl,
      file_name: `${(contract.name || "contrato").replace(/[^a-zA-Z0-9-_]/g, "_")}.pdf`,
      signers: signers.map((s) => ({
        email: s.email,
        name: s.name,
        signing_order: s.signing_order,
      })),
      deadline_at,
      message,
    });

    const now = new Date().toISOString();

    // Persist signers
    const signerRows = result.signers.map((s, idx) => ({
      tenant_id: tenantId,
      contract_id,
      email: s.email,
      full_name: s.name,
      signing_order: signers[idx]?.signing_order ?? idx + 1,
      provider_signer_id: s.signer_key,
      signing_url: s.sign_url ?? null,
      status: "sent",
    }));
    await admin.from("contract_signers").insert(signerRows);

    // Update contract
    await admin
      .from("contracts")
      .update({
        clicksign_document_key: result.document_key,
        clicksign_sent_at: now,
        signature_status: "Pending",
        updated_at: now,
      })
      .eq("id", contract_id);

    // Audit log
    await admin.from("signature_audit_logs").insert(
      signers.map((s) => ({
        tenant_id: tenantId,
        contract_id,
        signer_email: s.email,
        signer_name: s.name,
        status: "pending",
      })),
    );

    console.log(`[${reqId}] clicksign-send OK doc=${result.document_key}`);
    return json({
      success: true,
      document_key: result.document_key,
      signers: result.signers,
    });
  } catch (err) {
    console.error(`[${reqId}] clicksign-send error:`, err);
    const message = err instanceof Error ? err.message : "Erro interno";
    return json({ error: message }, 500);
  }
});
