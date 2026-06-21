import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FOCUS_BASE_PRODUCAO    = "https://api.focusnfe.com.br";
const FOCUS_BASE_HOMOLOGACAO = "https://homologacao.focusnfe.com.br";
const SEFAZ_TIMEOUT_MS = 10_000;

type SefazStatus =
  | "validado_sefaz"
  | "invalido_sefaz"
  | "sefaz_indisponivel"
  | "nao_configurado"
  | "nao_verificado";

async function updateSefazStatus(
  supabase: ReturnType<typeof createClient>,
  nfId: string,
  status: SefazStatus,
  validation: unknown | null,
) {
  await supabase
    .from("nf_approvals" as any)
    .update({
      sefaz_status: status,
      ...(validation !== null ? { sefaz_validation: validation } : {}),
    })
    .eq("id", nfId);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl  = Deno.env.get("SUPABASE_URL")!;
  const serviceKey   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase     = createClient(supabaseUrl, serviceKey);

  // Accept service role key OR valid user JWT
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    return new Response(JSON.stringify({ error: "Não autorizado" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json() as { nf_approval_id?: string };
    if (!body.nf_approval_id) {
      return new Response(JSON.stringify({ error: "nf_approval_id obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Fetch NF
    const { data: nf, error: nfErr } = await supabase
      .from("nf_approvals" as any)
      .select("id, tenant_id, chave_nfe")
      .eq("id", body.nf_approval_id)
      .single();

    if (nfErr || !nf) {
      return new Response(JSON.stringify({ error: "NF não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!(nf as any).chave_nfe) {
      await updateSefazStatus(supabase, (nf as any).id, "nao_verificado", null);
      return new Response(
        JSON.stringify({ status: "nao_verificado", message: "chave_nfe não disponível na NF" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const tenantId  = (nf as any).tenant_id as string;
    const chaveNfe  = (nf as any).chave_nfe as string;

    // 2. Fetch fiscal_settings for Focus NFe tokens
    const { data: fiscal } = await supabase
      .from("fiscal_settings")
      .select("focus_environment, focus_token_homologacao, focus_token_producao")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    const isProducao = (fiscal as any)?.focus_environment === "producao";
    const focusToken = isProducao
      ? (fiscal as any)?.focus_token_producao
      : (fiscal as any)?.focus_token_homologacao;

    if (!focusToken) {
      await updateSefazStatus(supabase, (nf as any).id, "nao_configurado", null);
      return new Response(
        JSON.stringify({ status: "nao_configurado", message: "Token Focus NFe não configurado" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const baseUrl = isProducao ? FOCUS_BASE_PRODUCAO : FOCUS_BASE_HOMOLOGACAO;
    const url     = `${baseUrl}/v2/nfe/${chaveNfe}?completo=1`;

    // Basic Auth: token as username, empty password
    const credentials = btoa(`${focusToken}:`);

    // 3. Consult SEFAZ via Focus NFe with 10s timeout
    let fetchResult: Response;
    try {
      const controller = new AbortController();
      const timeoutId  = setTimeout(() => controller.abort(), SEFAZ_TIMEOUT_MS);

      fetchResult = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Basic ${credentials}` },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchErr: any) {
      console.error("[validate-nf-sefaz] fetch error:", fetchErr?.message);
      await updateSefazStatus(supabase, (nf as any).id, "sefaz_indisponivel", null);
      return new Response(
        JSON.stringify({ status: "sefaz_indisponivel", message: "SEFAZ indisponível ou timeout" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 4. Interpret response
    if (fetchResult.status === 404) {
      await updateSefazStatus(supabase, (nf as any).id, "invalido_sefaz", null);
      return new Response(
        JSON.stringify({ status: "invalido_sefaz", message: "NF-e não encontrada na SEFAZ" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!fetchResult.ok) {
      console.warn("[validate-nf-sefaz] Focus NFe responded:", fetchResult.status);
      await updateSefazStatus(supabase, (nf as any).id, "sefaz_indisponivel", null);
      return new Response(
        JSON.stringify({ status: "sefaz_indisponivel", message: `Focus NFe retornou ${fetchResult.status}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let responseJson: any;
    try {
      responseJson = await fetchResult.json();
    } catch {
      await updateSefazStatus(supabase, (nf as any).id, "sefaz_indisponivel", null);
      return new Response(
        JSON.stringify({ status: "sefaz_indisponivel", message: "Resposta inválida da SEFAZ" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Focus NFe: status "cancelado" or "denegado" = NF inválida
    const nfStatus: string = responseJson?.status ?? responseJson?.situacao ?? "";
    const isInvalid = ["cancelado", "cancelado_extemporaneo", "denegado", "inutilizado"].includes(
      nfStatus.toLowerCase(),
    );

    if (isInvalid) {
      await updateSefazStatus(supabase, (nf as any).id, "invalido_sefaz", responseJson);
      return new Response(
        JSON.stringify({ status: "invalido_sefaz", sefaz_response: responseJson }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await updateSefazStatus(supabase, (nf as any).id, "validado_sefaz", responseJson);
    return new Response(
      JSON.stringify({ status: "validado_sefaz", sefaz_response: responseJson }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("[validate-nf-sefaz]", err);
    return new Response(JSON.stringify({ error: err.message ?? "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
