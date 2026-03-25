import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function addCycle(dateStr: string, cycle: string): string {
  const d = new Date(dateStr + "T12:00:00");
  if (cycle === "anual") {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  return d.toISOString().split("T")[0];
}

function periodEnd(startStr: string, cycle: string): string {
  const d = new Date(startStr + "T12:00:00");
  if (cycle === "anual") {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get subscriptions due within 5 days
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    const futureDateStr = futureDate.toISOString().split("T")[0];

    const { data: subs, error: subsError } = await supabase
      .from("subscriptions")
      .select("*, contracts(tenant_id, account_id, name), products(name)")
      .eq("status", "active")
      .lte("next_billing_date", futureDateStr);

    if (subsError) throw subsError;

    let generated = 0;

    for (const sub of subs || []) {
      const billingStart = sub.next_billing_date;
      const billingEnd = periodEnd(billingStart, sub.billing_cycle || "mensal");
      const tenantId = sub.contracts?.tenant_id || sub.tenant_id;

      // Check for duplicate
      const { data: existing } = await supabase
        .from("receivables")
        .select("id")
        .eq("subscription_id", sub.id)
        .eq("billing_period_start", billingStart)
        .limit(1);

      if (existing && existing.length > 0) continue;

      // Create receivable
      const desc = `Assinatura: ${sub.products?.name || "Plano"} — ${sub.contracts?.name || "Contrato"}`;
      const { error: insertError } = await supabase.from("receivables").insert({
        tenant_id: tenantId,
        description: desc,
        amount: sub.price,
        due_date: billingStart,
        status: "pending",
        subscription_id: sub.id,
        is_recurring: true,
        billing_period_start: billingStart,
        billing_period_end: billingEnd,
        customer_id: null,
      });

      if (insertError) {
        console.error("Error inserting receivable:", insertError);
        continue;
      }

      // Advance next_billing_date
      const nextDate = addCycle(billingStart, sub.billing_cycle || "mensal");
      await supabase.from("subscriptions").update({ next_billing_date: nextDate }).eq("id", sub.id);
      
      // Also update contract
      if (sub.contract_id) {
        await supabase.from("contracts").update({ next_billing_date: nextDate }).eq("id", sub.contract_id);
      }

      generated++;
    }

    return new Response(JSON.stringify({ success: true, generated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
