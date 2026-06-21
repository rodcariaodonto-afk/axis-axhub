import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function fmtBRL(v: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function fmtDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString("pt-BR");
  } catch {
    return d;
  }
}

function fmtCNPJ(cnpj: string | null): string {
  if (!cnpj) return "��";
  const c = cnpj.replace(/\D/g, "");
  if (c.length !== 14) return cnpj;
  return `${c.slice(0,2)}.${c.slice(2,5)}.${c.slice(5,8)}/${c.slice(8,12)}-${c.slice(12)}`;
}

interface RpaData {
  retention: {
    id: string;
    tenant_id: string;
    pj_id: string;
    nf_approval_id: string | null;
    valor_bruto: number;
    ir_value: number;
    pis_value: number;
    cofins_value: number;
    inss_value: number;
    iss_value: number;
    csll_value: number;
    total_retention: number;
    valor_liquido: number;
    created_at: string;
  };
  pj: { name: string; cnpj: string | null } | null;
  contratante: { company_name: string; cnpj: string; endereco_logradouro: string | null; endereco_numero: string | null; endereco_bairro: string | null; endereco_municipio: string | null; endereco_uf: string | null } | null;
  taxSettings: { aliquota_ir: number; aliquota_pis: number; aliquota_cofins: number; aliquota_inss: number; aliquota_iss: number; aliquota_csll: number } | null;
  nfNumber: string | null;
}

async function buildPDF(d: RpaData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const font  = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold  = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();

  const ml = 50; // margin left
  const mr = 50; // margin right
  const cw = width - ml - mr; // content width
  const gray = rgb(0.4, 0.4, 0.4);
  const dark = rgb(0.1, 0.1, 0.1);
  const accent = rgb(0.07, 0.35, 0.65);

  let y = height - 50;

  function text(t: string, x: number, yy: number, opts: { size?: number; fontRef?: typeof font; color?: typeof dark } = {}) {
    const { size = 10, fontRef = font, color = dark } = opts;
    page.drawText(t, { x, y: yy, size, font: fontRef, color });
  }

  function line(x1: number, y1: number, x2: number, y2: number, thickness = 0.5) {
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color: rgb(0.7, 0.7, 0.7) });
  }

  function sectionTitle(title: string, yy: number) {
    page.drawRectangle({ x: ml, y: yy - 4, width: cw, height: 16, color: rgb(0.93, 0.96, 1) });
    text(title.toUpperCase(), ml + 4, yy, { size: 9, fontRef: bold, color: accent });
    return yy - 22;
  }

  function row(label: string, value: string, yy: number, highlight = false) {
    if (highlight) {
      page.drawRectangle({ x: ml, y: yy - 3, width: cw, height: 16, color: rgb(0.95, 0.98, 0.95) });
    }
    text(label, ml + 4, yy, { size: 9, fontRef: font, color: gray });
    text(value, ml + 200, yy, { size: 9, fontRef: highlight ? bold : font, color: highlight ? accent : dark });
    return yy - 16;
  }

  function taxRow(label: string, rate: number, value: number, yy: number) {
    const rateStr = rate > 0 ? ` (${rate.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%)` : "";
    text(`(-) ${label}${rateStr}`, ml + 4, yy, { size: 9, color: gray });
    text(value > 0 ? fmtBRL(value) : "—", ml + 330, yy, { size: 9, fontRef: font, color: value > 0 ? rgb(0.7, 0.1, 0.1) : gray });
    return yy - 16;
  }

  // ─── Title ────────────────────────────────────────────────────
  page.drawRectangle({ x: ml, y: y - 6, width: cw, height: 28, color: accent });
  text("RECIBO DE PAGAMENTO AO PRESTADOR DE SERVIÇOS", ml + 6, y + 2, { size: 12, fontRef: bold, color: rgb(1, 1, 1) });
  y -= 38;
  text(`Data: ${fmtDate(d.retention.created_at)}   Nº RPA: ${d.retention.id.slice(0, 8).toUpperCase()}`, ml, y, { size: 8, color: gray });
  if (d.nfNumber) {
    text(`Nota Fiscal Nº: ${d.nfNumber}`, ml + 280, y, { size: 8, color: gray });
  }
  y -= 24;

  // ─── Contratante ─────────────────────────────────────────────
  y = sectionTitle("Contratante", y);
  const cname = d.contratante?.company_name ?? "���";
  const ccnpj = fmtCNPJ(d.contratante?.cnpj ?? null);
  const caddr = [
    d.contratante?.endereco_logradouro,
    d.contratante?.endereco_numero ? `nº ${d.contratante.endereco_numero}` : null,
    d.contratante?.endereco_bairro,
    d.contratante?.endereco_municipio,
    d.contratante?.endereco_uf,
  ].filter(Boolean).join(", ") || "—";

  y = row("Razão Social / Nome:", cname, y);
  y = row("CNPJ:", ccnpj, y);
  y = row("Endereço:", caddr, y);
  y -= 8;
  line(ml, y, ml + cw, y);
  y -= 16;

  // ─── Contratado (PJ) ─────────────────────────────────────────
  y = sectionTitle("Contratado (Prestador de Serviços)", y);
  y = row("Razão Social / Nome:", d.pj?.name ?? "—", y);
  y = row("CNPJ:", fmtCNPJ(d.pj?.cnpj ?? null), y);
  y -= 8;
  line(ml, y, ml + cw, y);
  y -= 16;

  // ─── Valores ─────────────────────────────────────────────────
  y = sectionTitle("Composição de Valores", y);

  // Valor bruto header
  page.drawRectangle({ x: ml, y: y - 3, width: cw, height: 16, color: rgb(0.97, 0.97, 0.97) });
  text("Valor bruto dos serviços:", ml + 4, y, { size: 9, fontRef: bold, color: dark });
  text(fmtBRL(d.retention.valor_bruto), ml + 330, y, { size: 9, fontRef: bold, color: dark });
  y -= 20;

  // Tax rows
  const ts = d.taxSettings;
  y = taxRow("IR",     ts?.aliquota_ir ?? 0,     d.retention.ir_value,     y);
  y = taxRow("PIS",    ts?.aliquota_pis ?? 0,    d.retention.pis_value,    y);
  y = taxRow("COFINS", ts?.aliquota_cofins ?? 0, d.retention.cofins_value, y);
  y = taxRow("INSS",   ts?.aliquota_inss ?? 0,   d.retention.inss_value,   y);
  y = taxRow("ISS",    ts?.aliquota_iss ?? 0,    d.retention.iss_value,    y);
  y = taxRow("CSLL",   ts?.aliquota_csll ?? 0,   d.retention.csll_value,   y);
  y -= 4;

  // Total retention
  line(ml + 250, y, ml + cw, y, 0.75);
  y -= 12;
  text("Total de retenções:", ml + 4, y, { size: 9, fontRef: bold, color: rgb(0.7, 0.1, 0.1) });
  text(fmtBRL(d.retention.total_retention), ml + 330, y, { size: 9, fontRef: bold, color: rgb(0.7, 0.1, 0.1) });
  y -= 20;

  // Net value highlight
  page.drawRectangle({ x: ml, y: y - 4, width: cw, height: 20, color: rgb(0.9, 0.97, 0.9) });
  text("VALOR LÍQUIDO A PAGAR:", ml + 4, y + 2, { size: 11, fontRef: bold, color: rgb(0.05, 0.5, 0.1) });
  text(fmtBRL(d.retention.valor_liquido), ml + 330, y + 2, { size: 11, fontRef: bold, color: rgb(0.05, 0.5, 0.1) });
  y -= 36;

  line(ml, y, ml + cw, y);
  y -= 24;

  // ─── Signature area ───────────────────────────────────────────
  text("O(A) CONTRATANTE confirma o pagamento ao prestador, deduzidas as retenções acima.", ml, y, { size: 8, color: gray });
  y -= 28;

  const sigW = (cw - 30) / 2;
  line(ml, y, ml + sigW, y, 0.75);
  line(ml + sigW + 30, y, ml + cw, y, 0.75);
  y -= 12;
  text("Assinatura do Contratante", ml + sigW / 2 - 50, y, { size: 8, color: gray });
  text("Assinatura do Prestador", ml + sigW + 30 + sigW / 2 - 48, y, { size: 8, color: gray });

  return pdfDoc.save();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase    = createClient(supabaseUrl, serviceKey);

  // Accept user JWT or service role key
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (token !== serviceKey) {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  try {
    const body = await req.json() as { pj_tax_retention_id: string };
    const { pj_tax_retention_id } = body;

    if (!pj_tax_retention_id) {
      return new Response(JSON.stringify({ error: "pj_tax_retention_id é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch retention
    const { data: ret, error: retErr } = await supabase
      .from("pj_tax_retentions" as any)
      .select("*")
      .eq("id", pj_tax_retention_id)
      .single();
    if (retErr || !ret) {
      return new Response(JSON.stringify({ error: "Retenção não encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const retention = ret as any;

    // Parallel fetches
    const [pjRes, fiscalRes, taxRes, nfRes] = await Promise.all([
      supabase.from("crm_accounts" as any).select("name, cnpj").eq("id", retention.pj_id).single(),
      supabase.from("fiscal_settings").select("company_name, cnpj, endereco_logradouro, endereco_numero, endereco_bairro, endereco_municipio, endereco_uf").eq("tenant_id", retention.tenant_id).maybeSingle(),
      supabase.from("pj_tax_settings" as any).select("aliquota_ir, aliquota_pis, aliquota_cofins, aliquota_inss, aliquota_iss, aliquota_csll").eq("tenant_id", retention.tenant_id).eq("pj_id", retention.pj_id).maybeSingle(),
      retention.nf_approval_id
        ? supabase.from("nf_approvals" as any).select("nf_number").eq("id", retention.nf_approval_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const rpaData: RpaData = {
      retention: {
        id:              retention.id,
        tenant_id:       retention.tenant_id,
        pj_id:           retention.pj_id,
        nf_approval_id:  retention.nf_approval_id,
        valor_bruto:     Number(retention.valor_bruto),
        ir_value:        Number(retention.ir_value),
        pis_value:       Number(retention.pis_value),
        cofins_value:    Number(retention.cofins_value),
        inss_value:      Number(retention.inss_value),
        iss_value:       Number(retention.iss_value),
        csll_value:      Number(retention.csll_value),
        total_retention: Number(retention.total_retention),
        valor_liquido:   Number(retention.valor_liquido),
        created_at:      retention.created_at,
      },
      pj: (pjRes.data as any) ?? null,
      contratante: (fiscalRes.data as any) ?? null,
      taxSettings: taxRes.data ? {
        aliquota_ir:     Number((taxRes.data as any).aliquota_ir),
        aliquota_pis:    Number((taxRes.data as any).aliquota_pis),
        aliquota_cofins: Number((taxRes.data as any).aliquota_cofins),
        aliquota_inss:   Number((taxRes.data as any).aliquota_inss),
        aliquota_iss:    Number((taxRes.data as any).aliquota_iss),
        aliquota_csll:   Number((taxRes.data as any).aliquota_csll),
      } : null,
      nfNumber: (nfRes.data as any)?.nf_number ?? null,
    };

    // Generate PDF
    const pdfBytes = await buildPDF(rpaData);

    // Upload to Storage
    const timestamp = Date.now();
    const storagePath = `${retention.tenant_id}/${retention.pj_id}/rpa/${timestamp}.pdf`;

    const { error: uploadErr } = await supabase.storage
      .from("pj-documents")
      .upload(storagePath, pdfBytes, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadErr) {
      console.error("[generate-rpa] upload error:", uploadErr);
      return new Response(JSON.stringify({ error: `Erro ao salvar PDF: ${uploadErr.message}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate signed URL (1 year TTL)
    const { data: signedData, error: signErr } = await supabase.storage
      .from("pj-documents")
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365);

    if (signErr || !signedData?.signedUrl) {
      console.error("[generate-rpa] sign error:", signErr);
      return new Response(JSON.stringify({ error: "Erro ao gerar URL do PDF" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rpaUrl = signedData.signedUrl;

    // Update pj_tax_retentions.rpa_url
    await supabase.from("pj_tax_retentions" as any).update({ rpa_url: rpaUrl }).eq("id", pj_tax_retention_id);

    return new Response(JSON.stringify({ ok: true, rpa_url: rpaUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[generate-rpa]", err);
    return new Response(JSON.stringify({ error: err.message ?? "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
