// =============================================================
// EDGE FUNCTION: focus-nfe-webhook
// Recebe callbacks da Focus quando uma nota muda de status
// =============================================================

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

interface WebhookPayload {
  ref?: string;
  status?: string;
  status_sefaz?: string;
  mensagem_sefaz?: string;
  chave_nfe?: string;
  numero?: string;
  serie?: string;
  caminho_xml_nota_fiscal?: string;
  caminho_danfe?: string;
  caminho_pdf_nota_fiscal?: string;
  cnpj_emitente?: string;
  [key: string]: unknown;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // Validacao basica de secret (proteger contra requisicoes externas malicas)
    // O secret e enviado como query param ?secret=XXX (configurado no painel Focus)
    const url = new URL(req.url);
    const providedSecret = url.searchParams.get("secret");
    const expectedSecret = Deno.env.get("FOCUS_WEBHOOK_SECRET");

    if (expectedSecret && providedSecret !== expectedSecret) {
      console.warn("[focus-webhook] secret invalido");
      return new Response("Forbidden", { status: 403 });
    }

    const payload = (await req.json()) as WebhookPayload;
    console.log("[focus-webhook] payload recebido:", JSON.stringify(payload));

    if (!payload.ref) {
      return new Response("ref ausente", { status: 400 });
    }

    // Cliente com service role pra poder atualizar sem JWT
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const newStatus = mapFocusStatusToInternal(payload.status);

    const { error } = await supabase
      .from("fiscal_invoices")
      .update({
        status: newStatus,
        status_sefaz: payload.status_sefaz ?? null,
        mensagem_sefaz: payload.mensagem_sefaz ?? null,
        chave_nfe: payload.chave_nfe ?? null,
        numero: payload.numero ?? null,
        serie: payload.serie ?? null,
        caminho_xml: payload.caminho_xml_nota_fiscal ?? null,
        caminho_danfe:
          payload.caminho_danfe ?? payload.caminho_pdf_nota_fiscal ?? null,
        resposta_focus: payload,
      })
      .eq("focus_ref", payload.ref);

    if (error) {
      console.error("[focus-webhook] erro ao atualizar:", error);
      return new Response("Erro: " + error.message, { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[focus-webhook] erro:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

function mapFocusStatusToInternal(focusStatus?: string): string {
  switch (focusStatus) {
    case "autorizado":
      return "autorizada";
    case "processando_autorizacao":
      return "processando";
    case "cancelado":
      return "cancelada";
    case "denegado":
    case "erro_autorizacao":
      return "rejeitada";
    default:
      return "processando";
  }
}
