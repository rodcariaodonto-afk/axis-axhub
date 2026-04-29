// =============================================================
// EDGE FUNCTION: process-fiscal-invoice
// Recebe order_id + type (nfe/nfse) e dispara emissão na Focus
// MOCK MODE habilitado em _shared/focus.ts
// =============================================================

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import {
  buildFocusAuthHeader,
  buildFocusUrl,
  FocusEnvironment,
  MOCK_MODE,
  MOCK_RESPONSES,
} from "../_shared/focus.ts";

interface ProcessRequest {
  order_id: string;
  type: "nfe" | "nfse";
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_id, type } = (await req.json()) as ProcessRequest;

    if (!order_id || !type) {
      return jsonResponse({ error: "order_id e type sao obrigatorios" }, 400);
    }

    if (!["nfe", "nfse"].includes(type)) {
      return jsonResponse({ error: "type deve ser nfe ou nfse" }, 400);
    }

    // Cliente Supabase autenticado com o JWT do usuario (respeita RLS)
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    // 1) Carrega fiscal_settings do tenant
    const { data: settings, error: settingsErr } = await supabase
      .from("fiscal_settings")
      .select("*")
      .single();

    if (settingsErr || !settings) {
      return jsonResponse(
        {
          error:
            "Configuracao fiscal nao encontrada. Configure em /settings/fiscal antes de emitir.",
        },
        400,
      );
    }

    if (type === "nfe" && !settings.habilita_nfe) {
      return jsonResponse({ error: "NF-e nao habilitada" }, 400);
    }
    if (type === "nfse" && !settings.habilita_nfse) {
      return jsonResponse({ error: "NFS-e nao habilitada" }, 400);
    }

    // 2) Carrega pedido + itens + cliente
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select(`
        *,
        order_items ( *, products ( * ) ),
        customers ( * )
      `)
      .eq("id", order_id)
      .single();

    if (orderErr || !order) {
      return jsonResponse({ error: "Pedido nao encontrado" }, 404);
    }

    const orderItems = order.order_items ?? [];
    if (orderItems.length === 0) {
      return jsonResponse({ error: "Pedido sem itens" }, 400);
    }

    // 3) Validacao de NCM/CFOP nos produtos (so pra NF-e)
    if (type === "nfe") {
      const produtosSemFiscal = orderItems
        .filter(
          (it: any) => !it.products?.ncm || !it.products?.cfop,
        )
        .map((it: any) => it.products?.name ?? it.product_id);

      if (produtosSemFiscal.length > 0) {
        return jsonResponse(
          {
            error:
              "Produtos sem NCM ou CFOP cadastrados: " +
              produtosSemFiscal.join(", "),
            produtos: produtosSemFiscal,
          },
          400,
        );
      }
    }

    // 4) Cria registro em fiscal_invoices (status pendente)
    const focusRef = crypto.randomUUID();
    const environment: FocusEnvironment = settings.focus_environment;

    const { data: invoice, error: invoiceErr } = await supabase
      .from("fiscal_invoices")
      .insert({
        tenant_id: settings.tenant_id,
        order_id,
        type,
        status: "pendente",
        focus_ref: focusRef,
        focus_environment: environment,
      })
      .select()
      .single();

    if (invoiceErr || !invoice) {
      return jsonResponse(
        { error: "Erro ao registrar nota: " + invoiceErr?.message },
        500,
      );
    }

    // 5) Monta payload Focus
    const payload =
      type === "nfe"
        ? buildNfePayload(order, orderItems, settings)
        : buildNfsePayload(order, orderItems, settings);

    // 6) Envia para Focus (ou mock)
    const focusResponse = await sendToFocus({
      type,
      ref: focusRef,
      payload,
      environment,
      token:
        environment === "homologacao"
          ? settings.focus_token_homologacao
          : settings.focus_token_producao,
    });

    // 7) Atualiza fiscal_invoices com resposta
    const newStatus = mapFocusStatusToInternal(focusResponse.status);
    await supabase
      .from("fiscal_invoices")
      .update({
        status: newStatus,
        status_sefaz: focusResponse.status_sefaz ?? null,
        mensagem_sefaz: focusResponse.mensagem_sefaz ?? null,
        chave_nfe: focusResponse.chave_nfe ?? null,
        numero: focusResponse.numero ?? null,
        serie: focusResponse.serie ?? null,
        caminho_xml: focusResponse.caminho_xml_nota_fiscal ?? null,
        caminho_danfe:
          focusResponse.caminho_danfe ?? focusResponse.caminho_pdf_nota_fiscal ?? null,
        payload_enviado: payload,
        resposta_focus: focusResponse,
      })
      .eq("id", invoice.id);

    return jsonResponse({
      ok: true,
      mock_mode: MOCK_MODE,
      invoice_id: invoice.id,
      focus_ref: focusRef,
      status: newStatus,
      response: focusResponse,
    });
  } catch (err) {
    console.error("[process-fiscal-invoice] erro:", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : String(err) },
      500,
    );
  }
});

// =============================================================
// HELPERS
// =============================================================

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

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

async function sendToFocus(args: {
  type: "nfe" | "nfse";
  ref: string;
  payload: unknown;
  environment: FocusEnvironment;
  token: string | null;
}): Promise<any> {
  if (MOCK_MODE) {
    console.log("[MOCK MODE] simulando POST para Focus:", args.type, args.ref);
    const mockKey = args.type === "nfe" ? "nfe_aceita" : "nfse_aceita";
    return { ...MOCK_RESPONSES[mockKey], ref: args.ref };
  }

  if (!args.token) {
    throw new Error(
      `Token Focus de ${args.environment} nao configurado em fiscal_settings`,
    );
  }

  const url = buildFocusUrl(
    args.environment,
    `/v2/${args.type}?ref=${args.ref}`,
  );

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: buildFocusAuthHeader(args.token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args.payload),
  });

  const text = await response.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  if (!response.ok) {
    console.error(
      `[Focus] HTTP ${response.status}:`,
      JSON.stringify(json),
    );
  }

  return json;
}

// =============================================================
// PAYLOAD BUILDERS
// =============================================================

function buildNfePayload(order: any, items: any[], settings: any) {
  const customer = order.customers ?? {};
  const isCnpj = !!customer.cnpj;

  return {
    natureza_operacao: "VENDA DE MERCADORIA",
    data_emissao: new Date().toISOString(),
    tipo_documento: 1, // saida
    finalidade_emissao: 1, // normal
    consumidor_final: 1,
    presenca_comprador: 2, // nao presencial (internet)

    // Emitente
    cnpj_emitente: settings.cnpj,
    nome_emitente: settings.company_name,
    inscricao_estadual_emitente: settings.ie ?? "",
    logradouro_emitente: settings.endereco_logradouro ?? "",
    numero_emitente: settings.endereco_numero ?? "",
    bairro_emitente: settings.endereco_bairro ?? "",
    municipio_emitente: settings.endereco_municipio ?? "",
    uf_emitente: settings.endereco_uf ?? "",
    cep_emitente: (settings.endereco_cep ?? "").replace(/\D/g, ""),
    regime_tributario_emitente: settings.regime_tributario,

    // Destinatario
    nome_destinatario:
      customer.name ?? "NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL",
    [isCnpj ? "cnpj_destinatario" : "cpf_destinatario"]:
      isCnpj ? customer.cnpj : (customer.cpf ?? ""),
    inscricao_estadual_destinatario: customer.ie ?? null,
    logradouro_destinatario: customer.address ?? "",
    numero_destinatario: customer.address_number ?? "S/N",
    bairro_destinatario: customer.neighborhood ?? "",
    municipio_destinatario: customer.city ?? "",
    uf_destinatario: customer.state ?? "",
    cep_destinatario: (customer.zip ?? "").replace(/\D/g, ""),
    pais_destinatario: "Brasil",
    indicador_inscricao_estadual_destinatario: 9, // nao contribuinte

    // Totais
    valor_total: Number(order.total ?? 0),
    valor_produtos: Number(order.total ?? 0),
    valor_frete: 0,
    valor_seguro: 0,
    modalidade_frete: 9, // sem frete

    // Itens
    items: items.map((it: any, idx: number) => {
      const product = it.products ?? {};
      const isSimples = settings.regime_tributario === 1;

      return {
        numero_item: idx + 1,
        codigo_produto: product.sku ?? product.id ?? `ITEM${idx + 1}`,
        descricao: product.name ?? "Produto",
        cfop: product.cfop ?? "5102",
        unidade_comercial: product.unidade_fiscal ?? "UN",
        quantidade_comercial: Number(it.quantity ?? 1),
        valor_unitario_comercial: Number(it.unit_price ?? 0),
        valor_unitario_tributavel: Number(it.unit_price ?? 0),
        unidade_tributavel: product.unidade_fiscal ?? "UN",
        codigo_ncm: (product.ncm ?? "").replace(/\D/g, ""),
        quantidade_tributavel: Number(it.quantity ?? 1),
        valor_bruto:
          Number(it.unit_price ?? 0) * Number(it.quantity ?? 1),
        icms_origem: product.origem_icms ?? 0,
        icms_situacao_tributaria: isSimples
          ? product.cst ?? "102"
          : product.cst ?? "00",
        pis_situacao_tributaria: "07",
        cofins_situacao_tributaria: "07",
      };
    }),
  };
}

function buildNfsePayload(order: any, items: any[], settings: any) {
  const customer = order.customers ?? {};
  const isCnpj = !!customer.cnpj;

  // Para NFS-e somamos todos os itens em uma unica descricao
  const descricaoServico = items
    .map(
      (it: any) =>
        `${it.products?.name ?? "Servico"} (qtd: ${it.quantity}, R$ ${it.unit_price})`,
    )
    .join(" | ");

  return {
    prestador: {
      cnpj: settings.cnpj,
      inscricao_municipal: settings.im ?? "",
      codigo_municipio: settings.codigo_municipio_ibge ?? "",
    },
    tomador: {
      [isCnpj ? "cnpj" : "cpf"]: isCnpj ? customer.cnpj : (customer.cpf ?? ""),
      razao_social: customer.name ?? "Tomador nao identificado",
      email: customer.email ?? null,
      endereco: {
        logradouro: customer.address ?? "",
        numero: customer.address_number ?? "S/N",
        bairro: customer.neighborhood ?? "",
        codigo_municipio: customer.codigo_municipio_ibge ?? null,
        uf: customer.state ?? "",
        cep: (customer.zip ?? "").replace(/\D/g, ""),
      },
    },
    servico: {
      aliquota: 0,
      iss_retido: false,
      item_lista_servico: "01.01",
      codigo_tributario_municipio: "010100",
      discriminacao: descricaoServico,
      codigo_municipio: settings.codigo_municipio_ibge ?? "",
      valor_servicos: Number(order.total ?? 0),
    },
  };
}
