import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApproveBody {
  nf_approval_id: string;
  step_id: string;
  action: "approve" | "reject";
  comment?: string;
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

  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Não autorizado" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json() as ApproveBody;
    const { nf_approval_id, step_id, action, comment } = body;

    if (!nf_approval_id || !step_id || !action) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: nf_approval_id, step_id, action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (action !== "approve" && action !== "reject") {
      return new Response(
        JSON.stringify({ error: "action deve ser 'approve' ou 'reject'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (action === "reject" && !comment?.trim()) {
      return new Response(
        JSON.stringify({ error: "Motivo é obrigatório para rejeição" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch step
    const { data: step, error: stepErr } = await supabase
      .from("nf_approval_steps" as any)
      .select("*")
      .eq("id", step_id)
      .eq("nf_approval_id", nf_approval_id)
      .single();
    if (stepErr || !step) {
      return new Response(
        JSON.stringify({ error: "Step não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if ((step as any).status !== "pendente") {
      return new Response(
        JSON.stringify({ error: "Step não está pendente" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch NF
    const { data: nf, error: nfErr } = await supabase
      .from("nf_approvals" as any)
      .select("*, crm_accounts(name)")
      .eq("id", nf_approval_id)
      .single();
    if (nfErr || !nf) {
      return new Response(
        JSON.stringify({ error: "NF não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date().toISOString();
    const nfRecord = nf as any;

    if (action === "approve") {
      // Mark this step as approved
      await supabase
        .from("nf_approval_steps" as any)
        .update({ status: "aprovado", acted_at: now, approver_id: user.id })
        .eq("id", step_id);

      // Check if there are remaining 'aguardando' steps
      const { data: allSteps } = await supabase
        .from("nf_approval_steps" as any)
        .select("id, step_number, status")
        .eq("nf_approval_id", nf_approval_id)
        .order("step_number", { ascending: true });

      const remaining = ((allSteps ?? []) as any[]).filter(
        (s) => s.id !== step_id && s.status === "aguardando"
      );

      if (remaining.length > 0) {
        // Activate the next waiting step
        await supabase
          .from("nf_approval_steps" as any)
          .update({ status: "pendente" })
          .eq("id", remaining[0].id);
      } else {
        // All levels approved — finalize NF
        await supabase
          .from("nf_approvals" as any)
          .update({ status: "aprovada", approved_at: now })
          .eq("id", nf_approval_id);

        // Get workflow config to check auto_create_payable
        const { data: config } = await supabase
          .from("nf_workflow_config" as any)
          .select("auto_create_payable")
          .eq("tenant_id", nfRecord.tenant_id)
          .maybeSingle();

        const autoCreate = (config as any)?.auto_create_payable !== false;
        if (autoCreate) {
          const pjName = (nfRecord.crm_accounts as any)?.name ?? nfRecord.pj_id;
          try {
            const { data: payable } = await supabase
              .from("payables" as any)
              .insert({
                tenant_id: nfRecord.tenant_id,
                description: `NF ${nfRecord.nf_number} - ${pjName}`,
                amount: nfRecord.nf_value,
                due_date: nfRecord.nf_due_date ?? nfRecord.nf_date,
                pj_id: nfRecord.pj_id,
                status: "pending",
                repasse_type: "nf",
              })
              .select("id")
              .single();

            if ((payable as any)?.id) {
              await supabase
                .from("nf_approvals" as any)
                .update({ payable_id: (payable as any).id })
                .eq("id", nf_approval_id);
            }
          } catch (payableErr) {
            console.error("[approve-nf-step] payable creation failed:", payableErr);
          }
        }

        // Notify PJ: approved
        await supabase.from("pj_notifications" as any).insert({
          tenant_id: nfRecord.tenant_id,
          pj_id: nfRecord.pj_id,
          type: "nf_aprovada",
          title: "Nota Fiscal Aprovada",
          body: `Sua NF ${nfRecord.nf_number} foi aprovada com sucesso.`,
          read: false,
        });
      }
    } else {
      // Reject: mark step and NF
      await supabase
        .from("nf_approval_steps" as any)
        .update({ status: "rejeitado", acted_at: now, approver_id: user.id, comment })
        .eq("id", step_id);

      await supabase
        .from("nf_approvals" as any)
        .update({ status: "rejeitada" })
        .eq("id", nf_approval_id);

      // Notify PJ: rejected
      await supabase.from("pj_notifications" as any).insert({
        tenant_id: nfRecord.tenant_id,
        pj_id: nfRecord.pj_id,
        type: "nf_rejeitada",
        title: "Nota Fiscal Rejeitada",
        body: `Sua NF ${nfRecord.nf_number} foi rejeitada. Motivo: ${comment}`,
        read: false,
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[approve-nf-step]", err);
    return new Response(JSON.stringify({ error: err.message ?? "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
