import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const today = new Date().toISOString().split("T")[0];
    let generated = 0;
    let cancelled = 0;
    let errors: string[] = [];

    // Buscar recorrências ativas que devem gerar hoje
    const { data: recurrences, error: fetchError } = await serviceClient
      .from("payment_recurrences")
      .select("*, payables!payment_recurrences_original_account_id_fkey(description, amount, supplier_id, category_id, accounting_type, accounting_group)")
      .eq("status", "active")
      .lte("next_generation_date", today);

    if (fetchError) throw fetchError;

    for (const rec of recurrences || []) {
      try {
        // Verificar se end_date já passou
        if (rec.end_date && new Date(rec.end_date) < new Date(rec.next_generation_date)) {
          await serviceClient
            .from("payment_recurrences")
            .update({ status: "cancelled" })
            .eq("id", rec.id);
          cancelled++;
          continue;
        }

        const template = rec.payables;
        if (!template) {
          errors.push(`Template não encontrado para recorrência ${rec.id}`);
          continue;
        }

        // Criar nova conta com base no template
        const { error: insertError } = await serviceClient
          .from("payables")
          .insert({
            tenant_id: rec.tenant_id,
            description: template.description,
            amount: template.amount,
            due_date: rec.next_generation_date,
            supplier_id: template.supplier_id,
            category_id: template.category_id,
            accounting_type: template.accounting_type,
            accounting_group: template.accounting_group,
            recurrence_id: rec.id,
            is_recurring_template: false,
            status: "pending",
          });

        if (insertError) {
          errors.push(`Erro ao criar conta para recorrência ${rec.id}: ${insertError.message}`);
          continue;
        }

        // Calcular próxima data via RPC
        const { data: nextDate, error: dateError } = await serviceClient.rpc(
          "calculate_next_recurrence_date",
          {
            base_date: rec.next_generation_date,
            freq_type: rec.frequency_type,
            freq_interval: rec.frequency_interval,
          }
        );

        if (dateError) {
          errors.push(`Erro ao calcular próxima data: ${dateError.message}`);
          continue;
        }

        // Atualizar next_generation_date
        await serviceClient
          .from("payment_recurrences")
          .update({ next_generation_date: nextDate })
          .eq("id", rec.id);

        // Se nova data passa do end_date, cancelar
        if (rec.end_date && new Date(nextDate) > new Date(rec.end_date)) {
          await serviceClient
            .from("payment_recurrences")
            .update({ status: "cancelled" })
            .eq("id", rec.id);
        }

        generated++;
      } catch (err: any) {
        errors.push(`Erro processando recorrência ${rec.id}: ${err.message}`);
      }
    }

    console.log(`[process-recurrences] Gerado: ${generated}, Cancelado: ${cancelled}, Erros: ${errors.length}`);

    return new Response(
      JSON.stringify({ success: true, generated, cancelled, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("process-recurrences error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
