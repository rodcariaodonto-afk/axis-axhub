import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Accept either service role key or a valid user JWT
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (token !== serviceRoleKey) {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  try {
    const body = await req.json() as { nf_approval_id: string };
    const { nf_approval_id } = body;

    if (!nf_approval_id) {
      return new Response(
        JSON.stringify({ error: "nf_approval_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch NF approval
    const { data: nf, error: nfErr } = await supabase
      .from("nf_approvals" as any)
      .select("id, tenant_id, pj_id, nf_value")
      .eq("id", nf_approval_id)
      .single();
    if (nfErr || !nf) {
      return new Response(
        JSON.stringify({ error: "NF não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const nfRecord = nf as any;

    // Idempotency: return existing record if already calculated
    const { data: existing } = await supabase
      .from("pj_tax_retentions" as any)
      .select("*")
      .eq("nf_approval_id", nf_approval_id)
      .maybeSingle();

    if (existing) {
      const r = existing as any;
      return new Response(
        JSON.stringify({
          tax_retention_id: r.id,
          valor_bruto: r.valor_bruto,
          ir_value: r.ir_value,
          pis_value: r.pis_value,
          cofins_value: r.cofins_value,
          inss_value: r.inss_value,
          iss_value: r.iss_value,
          csll_value: r.csll_value,
          total_retention: r.total_retention,
          valor_liquido: r.valor_liquido,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const valorBruto: number = Number(nfRecord.nf_value);

    // Fetch tax settings for this PJ (optional — if missing, no retentions)
    const { data: taxSettings } = await supabase
      .from("pj_tax_settings" as any)
      .select("*")
      .eq("tenant_id", nfRecord.tenant_id)
      .eq("pj_id", nfRecord.pj_id)
      .maybeSingle();

    let irValue = 0, pisValue = 0, cofinsValue = 0;
    let inssValue = 0, issValue = 0, csllValue = 0;

    if (taxSettings) {
      const t = taxSettings as any;
      irValue     = round2(valorBruto * (Number(t.aliquota_ir) / 100));
      pisValue    = round2(valorBruto * (Number(t.aliquota_pis) / 100));
      cofinsValue = round2(valorBruto * (Number(t.aliquota_cofins) / 100));
      inssValue   = round2(valorBruto * (Number(t.aliquota_inss) / 100));
      issValue    = round2(valorBruto * (Number(t.aliquota_iss) / 100));
      csllValue   = round2(valorBruto * (Number(t.aliquota_csll) / 100));
    }

    const totalRetention = round2(irValue + pisValue + cofinsValue + inssValue + issValue + csllValue);
    const valorLiquido   = round2(valorBruto - totalRetention);

    // Insert tax retention record
    const { data: inserted, error: insertErr } = await supabase
      .from("pj_tax_retentions" as any)
      .insert({
        tenant_id: nfRecord.tenant_id,
        pj_id: nfRecord.pj_id,
        nf_approval_id,
        valor_bruto: valorBruto,
        ir_value: irValue,
        pis_value: pisValue,
        cofins_value: cofinsValue,
        inss_value: inssValue,
        iss_value: issValue,
        csll_value: csllValue,
        total_retention: totalRetention,
        valor_liquido: valorLiquido,
      })
      .select("id")
      .single();

    if (insertErr) {
      console.error("[calculate-tax-retention] insert error:", insertErr);
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        tax_retention_id: (inserted as any).id,
        valor_bruto: valorBruto,
        ir_value: irValue,
        pis_value: pisValue,
        cofins_value: cofinsValue,
        inss_value: inssValue,
        iss_value: issValue,
        csll_value: csllValue,
        total_retention: totalRetention,
        valor_liquido: valorLiquido,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[calculate-tax-retention]", err);
    return new Response(JSON.stringify({ error: err.message ?? "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
