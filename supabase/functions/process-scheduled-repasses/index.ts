import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Calculates next execution date based on frequency and optional day_of_month
function calcNextDate(current: string, frequencia: string, diaExecucao: number | null): string {
  const date = new Date(current + "T12:00:00Z");

  switch (frequencia) {
    case "diario":
      date.setUTCDate(date.getUTCDate() + 1);
      break;
    case "semanal":
      date.setUTCDate(date.getUTCDate() + 7);
      break;
    case "quinzenal":
      date.setUTCDate(date.getUTCDate() + 14);
      break;
    case "mensal": {
      const targetDay = diaExecucao ?? date.getUTCDate();
      const nextMonth = date.getUTCMonth() + 1; // 0-based → next month index
      const nextYear  = nextMonth > 11 ? date.getUTCFullYear() + 1 : date.getUTCFullYear();
      const monthIdx  = nextMonth % 12;
      // Last day of next month
      const lastDay   = new Date(Date.UTC(nextYear, monthIdx + 1, 0)).getUTCDate();
      const day       = Math.min(targetDay, lastDay);
      date.setUTCFullYear(nextYear, monthIdx, day);
      break;
    }
    default:
      date.setUTCDate(date.getUTCDate() + 30);
  }

  return date.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl   = Deno.env.get("SUPABASE_URL")!;
  const serviceKey    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase      = createClient(supabaseUrl, serviceKey);

  // Require service role key
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (token !== serviceKey) {
    return new Response(JSON.stringify({ error: "Não autorizado" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const today = new Date().toISOString().slice(0, 10);

    // Fetch schedules due today or overdue
    const { data: schedules, error: fetchErr } = await supabase
      .from("pj_repasse_schedules" as any)
      .select("*, crm_accounts(name)")
      .lte("proxima_data", today)
      .eq("status", "ativo");

    if (fetchErr) {
      console.error("[process-scheduled-repasses] fetch error:", fetchErr);
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!schedules || (schedules as any[]).length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0, skipped: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    let skipped   = 0;

    for (const raw of schedules as any[]) {
      const schedule = raw;
      const executionDate = schedule.proxima_data as string;

      // Idempotency: skip if already processed for this schedule + date
      const { data: existing } = await supabase
        .from("pj_repasse_history" as any)
        .select("id")
        .eq("schedule_id", schedule.id)
        .eq("data_repasse", executionDate)
        .limit(1);

      if (existing && (existing as any[]).length > 0) {
        skipped++;
        console.log(`[process-scheduled-repasses] skip idempotent: schedule=${schedule.id} date=${executionDate}`);

        // Still update proxima_data if recorrente, in case it was skipped previously
        if (schedule.recorrente && schedule.frequencia) {
          const nextDate = calcNextDate(executionDate, schedule.frequencia, schedule.dia_execucao);
          await supabase.from("pj_repasse_schedules" as any).update({ proxima_data: nextDate }).eq("id", schedule.id);
        }
        continue;
      }

      const pjName: string = (schedule.crm_accounts as any)?.name ?? schedule.pj_id;

      // 1. Create payable
      let payableId: string | null = null;
      try {
        const { data: payable } = await supabase
          .from("payables" as any)
          .insert({
            tenant_id:      schedule.tenant_id,
            pj_id:          schedule.pj_id,
            description:    `Repasse automático — ${pjName}`,
            amount:         schedule.valor,
            due_date:       executionDate,
            status:         "pending",
            repasse_type:   "automatico",
            repasse_status: "processado",
          })
          .select("id")
          .single();
        payableId = (payable as any)?.id ?? null;
      } catch (payErr) {
        console.error("[process-scheduled-repasses] payable error:", payErr);
      }

      // 2. Create pj_repasse_history
      try {
        await supabase.from("pj_repasse_history" as any).insert({
          tenant_id:   schedule.tenant_id,
          pj_id:       schedule.pj_id,
          valor:       schedule.valor,
          data_repasse: executionDate,
          status:      "processado",
          schedule_id: schedule.id,
          payable_id:  payableId,
        });
      } catch (histErr) {
        console.error("[process-scheduled-repasses] history error:", histErr);
      }

      // 3. Notify PJ
      try {
        await supabase.from("pj_notifications" as any).insert({
          tenant_id: schedule.tenant_id,
          pj_id:     schedule.pj_id,
          type:      "repasse_realizado",
          title:     "Repasse realizado",
          message:   `Seu repasse de ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(schedule.valor)} foi processado em ${executionDate}.`,
          is_read:   false,
        });
      } catch (notifErr) {
        console.error("[process-scheduled-repasses] notification error:", notifErr);
      }

      // 4. Update schedule: advance date (recorrente) or cancel (one-shot)
      if (schedule.recorrente && schedule.frequencia) {
        const nextDate = calcNextDate(executionDate, schedule.frequencia, schedule.dia_execucao);
        await supabase.from("pj_repasse_schedules" as any)
          .update({ proxima_data: nextDate })
          .eq("id", schedule.id);
      } else {
        // One-shot: mark as cancelled so it doesn't run again
        await supabase.from("pj_repasse_schedules" as any)
          .update({ status: "cancelado" })
          .eq("id", schedule.id);
      }

      processed++;
      console.log(`[process-scheduled-repasses] processed schedule=${schedule.id} pj=${pjName} valor=${schedule.valor}`);
    }

    return new Response(
      JSON.stringify({ ok: true, processed, skipped, total: (schedules as any[]).length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[process-scheduled-repasses]", err);
    return new Response(JSON.stringify({ error: err.message ?? "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
