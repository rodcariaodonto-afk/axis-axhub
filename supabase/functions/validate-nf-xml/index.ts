import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ParsedNF {
  nf_number: string | null;
  nf_series: string | null;
  nf_value: number | null;
  nf_date: string | null;
  cnpj_emitente: string | null;
  validation_errors: string[];
}

/** Extract text content of a simple XML tag (first occurrence) */
function extractTag(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, "i");
  const m = xml.match(re);
  return m ? m[1].trim() : null;
}

/** Extract CNPJ from <emit> block (emitente, not destinatário) */
function extractEmitenteCNPJ(xml: string): string | null {
  const emitBlock = xml.match(/<emit[\s>][\s\S]*?<\/emit>/i);
  if (!emitBlock) return null;
  const m = emitBlock[0].match(/<CNPJ>(\d+)<\/CNPJ>/);
  return m ? m[1] : null;
}

/** Parse ISO or NF-e date format (2024-01-15T00:00:00-03:00 → 2024-01-15) */
function parseNFDate(raw: string | null): string | null {
  if (!raw) return null;
  const m = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function parseNF(xml: string): ParsedNF {
  const errors: string[] = [];

  const nf_number = extractTag(xml, "nNF");
  const nf_series = extractTag(xml, "serie");
  const nf_date = parseNFDate(extractTag(xml, "dhEmi") ?? extractTag(xml, "dEmi"));
  const cnpj_emitente = extractEmitenteCNPJ(xml);

  // vNF lives inside <ICMSTot> or <total> — use last occurrence to avoid picking up item totals
  const vNFMatches = [...xml.matchAll(/<vNF>([\d.]+)<\/vNF>/gi)];
  const rawValue = vNFMatches.length > 0 ? vNFMatches[vNFMatches.length - 1][1] : null;
  const nf_value = rawValue != null ? parseFloat(rawValue) : null;

  // Validate required fields
  if (!nf_number) errors.push("Número da NF não encontrado (nNF)");
  if (!nf_value || isNaN(nf_value) || nf_value <= 0) errors.push("Valor total não encontrado ou inválido (vNF)");
  if (!nf_date) errors.push("Data de emissão não encontrada (dhEmi)");
  if (!cnpj_emitente) errors.push("CNPJ do emitente não encontrado");

  return { nf_number, nf_series, nf_value, nf_date, cnpj_emitente, validation_errors: errors };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Service role client available for future DB validation (SEFAZ, etc.)
  const _supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json() as { xml?: string };

    if (!body.xml || typeof body.xml !== "string" || body.xml.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Campo 'xml' obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = parseNF(body.xml);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[validate-nf-xml]", err);
    return new Response(JSON.stringify({ error: err.message ?? "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
