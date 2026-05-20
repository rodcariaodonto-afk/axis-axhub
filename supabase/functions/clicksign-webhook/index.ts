import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  ClicksignClient,
  parseClicksignWebhook,
  verifyClicksignHmac,
} from "../_shared/clicksign-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, content-hmac",
};

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const rawBody = await req.text();
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return json({ error: "JSON inválido" }, 400);
    }

    const parsed = parseClicksignWebhook(payload);
    console.log(`[${reqId}] clicksign-webhook event=${parsed.event_name} doc=${parsed.document_key}`);

    if (!parsed.document_key) return json({ error: "document.key ausente" }, 400);

    // Identify tenant via stored document_key
    const { data: contract, error: cErr } = await admin
      .from("contracts")
      .select("id, tenant_id, name, document_url, clicksign_document_key, owner_id")
      .eq("clicksign_document_key", parsed.document_key)
      .maybeSingle();
    if (cErr || !contract) {
      console.warn(`[${reqId}] contract não encontrado para doc=${parsed.document_key}`);
      return json({ ok: true, ignored: true });
    }

    // Validate HMAC against tenant's secret
    const { data: integration } = await admin
      .from("integrations")
      .select("api_key, api_secret")
      .eq("tenant_id", contract.tenant_id)
      .eq("slug", "clicksign")
      .maybeSingle();

    const hmacHeader = req.headers.get("content-hmac") ?? req.headers.get("Content-Hmac");
    if (integration?.api_secret) {
      const valid = await verifyClicksignHmac(rawBody, hmacHeader, integration.api_secret);
      if (!valid) {
        console.warn(`[${reqId}] HMAC inválido`);
        return json({ error: "HMAC inválido" }, 401);
      }
    }

    const now = new Date().toISOString();

    // Update signer if applicable
    if (parsed.signed_signer_email) {
      await admin
        .from("contract_signers")
        .update({ status: "signed", signed_at: now })
        .eq("contract_id", contract.id)
        .eq("email", parsed.signed_signer_email);

      await admin.from("signature_audit_logs").insert({
        tenant_id: contract.tenant_id,
        contract_id: contract.id,
        signer_email: parsed.signed_signer_email,
        status: "verified",
        signed_at: now,
        otp_verified: true,
      });
    }

    // Update contract status
    if (parsed.status) {
      const updates: Record<string, unknown> = {
        signature_status:
          parsed.status === "signed"
            ? "Signed"
            : parsed.status === "partially_signed"
              ? "Pending"
              : parsed.status === "refused"
                ? "Cancelado"
                : parsed.status === "cancelled"
                  ? "Cancelado"
                  : parsed.status === "expired"
                    ? "Expirado"
                    : "Pending",
        updated_at: now,
      };

      // On full signature, download signed PDF and store
      if (parsed.status === "signed" && integration?.api_key) {
        updates.signed_at = now;
        try {
          const client = new ClicksignClient(integration.api_key);
          const dl = await client.downloadSignedDocument(parsed.document_key);
          if (dl?.url) {
            const fileRes = await fetch(dl.url);
            if (fileRes.ok) {
              const buf = new Uint8Array(await fileRes.arrayBuffer());
              const path = `${contract.tenant_id}/${contract.id}/${Date.now()}_signed.pdf`;
              const { error: upErr } = await admin.storage
                .from("signed-contracts")
                .upload(path, buf, { contentType: "application/pdf", upsert: true });
              if (!upErr) {
                updates.document_url = path;
              }
            }
          }
        } catch (e) {
          console.error(`[${reqId}] erro baixando PDF assinado:`, e);
        }

        // In-app notification
        if (contract.owner_id) {
          await admin.from("notifications").insert({
            tenant_id: contract.tenant_id,
            user_id: contract.owner_id,
            type: "contract_signed",
            title: "Contrato assinado",
            message: `O contrato "${contract.name}" foi assinado por todos os signatários.`,
            priority: "high",
            data: { contract_id: contract.id },
          });
        }
      }

      await admin.from("contracts").update(updates).eq("id", contract.id);
    }

    return json({ ok: true });
  } catch (err) {
    console.error(`[${reqId}] clicksign-webhook error:`, err);
    const msg = err instanceof Error ? err.message : "Erro interno";
    return json({ error: msg }, 500);
  }
});
