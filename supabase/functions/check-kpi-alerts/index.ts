import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch all active alerts with their widget config
    const { data: alerts, error: alertsError } = await supabase
      .from("bi_alerts")
      .select("*, bi_widgets(*)")
      .eq("is_active", true);

    if (alertsError) throw alertsError;
    if (!alerts || alerts.length === 0) {
      return new Response(JSON.stringify({ message: "No active alerts" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const triggered: string[] = [];

    for (const alert of alerts) {
      const widget = alert.bi_widgets;
      if (!widget) continue;

      // Execute the widget query via RPC
      const { data: queryResult, error: queryError } = await supabase.rpc(
        "execute_bi_widget_query",
        {
          p_metric: widget.metric,
          p_dimension: widget.dimension,
          p_aggregation: widget.aggregation || "sum",
        }
      );

      if (queryError) {
        console.error(`Error querying widget ${widget.id}:`, queryError);
        continue;
      }

      // Calculate total value from results
      const results = Array.isArray(queryResult) ? queryResult : [];
      const totalValue = results.reduce(
        (sum: number, r: { value: number }) => sum + (r.value || 0),
        0
      );

      // Check condition
      let conditionMet = false;
      switch (alert.condition) {
        case "gt":
          conditionMet = totalValue > alert.threshold;
          break;
        case "lt":
          conditionMet = totalValue < alert.threshold;
          break;
        case "eq":
          conditionMet = totalValue === alert.threshold;
          break;
        case "gte":
          conditionMet = totalValue >= alert.threshold;
          break;
        case "lte":
          conditionMet = totalValue <= alert.threshold;
          break;
      }

      if (conditionMet) {
        await supabase.from("bi_alert_logs").insert({
          tenant_id: alert.tenant_id,
          alert_id: alert.id,
          triggered_value: totalValue,
          threshold: alert.threshold,
          condition: alert.condition,
        });
        triggered.push(alert.name);
      }
    }

    return new Response(
      JSON.stringify({ triggered, count: triggered.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
