import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function clamp(v: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, v));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase    = createClient(supabaseUrl, serviceKey);

  if (!req.headers.get("Authorization")) {
    return new Response(JSON.stringify({ error: "Não autorizado" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json() as { pj_id?: string; tenant_id?: string };
    if (!body.pj_id || !body.tenant_id) {
      return new Response(JSON.stringify({ error: "pj_id e tenant_id são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { pj_id, tenant_id } = body;

    // ── 1. evaluation_score ─────────────────────────────────────────────────
    // Média dos overall_score (escala 0-5), normalizado para 0-100
    const { data: evaluations } = await supabase
      .from("pj_evaluations" as any)
      .select("overall_score")
      .eq("pj_id", pj_id)
      .eq("tenant_id", tenant_id);

    let evaluation_score = 0;
    if (evaluations && evaluations.length > 0) {
      const avg = (evaluations as any[]).reduce((sum, e) => sum + Number(e.overall_score), 0) / evaluations.length;
      evaluation_score = clamp((avg / 5) * 100);
    }

    // ── 2. compliance_score ─────────────────────────────────────────────────
    // % docs obrigatórios com validation_status='valido' / total tipos obrigatórios
    const { data: mandatoryTypes } = await supabase
      .from("pj_document_types")
      .select("id")
      .eq("tenant_id", tenant_id)
      .eq("is_mandatory", true);

    let compliance_score = 100; // default: sem tipos obrigatórios = 100% compliant
    if (mandatoryTypes && mandatoryTypes.length > 0) {
      const typeIds = (mandatoryTypes as any[]).map((t) => t.id);

      const { data: validDocs } = await supabase
        .from("pj_documents")
        .select("document_type_id")
        .eq("pj_id", pj_id)
        .eq("tenant_id", tenant_id)
        .eq("validation_status", "valido")
        .in("document_type_id", typeIds);

      const coveredTypes = new Set(((validDocs ?? []) as any[]).map((d) => d.document_type_id));
      compliance_score = clamp((coveredTypes.size / typeIds.length) * 100);
    }

    // ── 3. punctuality_score ────────────────────────────────────────────────
    // % NFs submetidas antes ou no prazo (created_at <= nf_due_date)
    const { data: allNFs } = await supabase
      .from("nf_approvals")
      .select("id, created_at, nf_due_date")
      .eq("pj_id", pj_id)
      .eq("tenant_id", tenant_id);

    let punctuality_score = 100; // sem NFs = 100%
    if (allNFs && allNFs.length > 0) {
      const nfsWithDueDate = (allNFs as any[]).filter((n) => n.nf_due_date);
      if (nfsWithDueDate.length > 0) {
        const onTime = nfsWithDueDate.filter((n) => {
          const submitted = new Date(n.created_at).toISOString().split("T")[0];
          return submitted <= n.nf_due_date;
        });
        punctuality_score = clamp((onTime.length / nfsWithDueDate.length) * 100);
      }
    }

    // ── 4. rejection_penalty ────────────────────────────────────────────────
    // % NFs rejeitadas / total NFs (não normalizado; subtrai da fórmula final)
    let rejection_penalty = 0;
    if (allNFs && allNFs.length > 0) {
      const { data: rejectedNFs } = await supabase
        .from("nf_approvals")
        .select("id")
        .eq("pj_id", pj_id)
        .eq("tenant_id", tenant_id)
        .eq("status", "rejeitada");

      const rejectedCount = (rejectedNFs ?? []).length;
      rejection_penalty = clamp((rejectedCount / allNFs.length) * 100);
    }

    // ── 5. final_score ──────────────────────────────────────────────────────
    const raw_score =
      evaluation_score * 0.4 +
      compliance_score * 0.3 +
      punctuality_score * 0.2 -
      rejection_penalty * 0.1;

    const final_score = clamp(Math.round(raw_score * 100) / 100);

    // ── 6. UPSERT pj_composite_scores ───────────────────────────────────────
    const { error: upsertErr } = await supabase
      .from("pj_composite_scores" as any)
      .upsert(
        {
          tenant_id,
          pj_id,
          evaluation_score,
          compliance_score,
          punctuality_score,
          rejection_penalty,
          final_score,
          calculated_at: new Date().toISOString(),
        },
        { onConflict: "tenant_id,pj_id" }
      );

    if (upsertErr) throw upsertErr;

    return new Response(
      JSON.stringify({
        pj_id,
        final_score,
        breakdown: { evaluation_score, compliance_score, punctuality_score, rejection_penalty },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[calculate-pj-score]", err);
    return new Response(JSON.stringify({ error: err.message ?? "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
