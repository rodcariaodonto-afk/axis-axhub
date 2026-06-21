import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Default alert thresholds when contract.alert_days_before_expiry is null
const DEFAULT_THRESHOLDS = [30, 15, 7];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Max horizon: 30 days ahead
    const horizon = new Date(today);
    horizon.setDate(horizon.getDate() + 30);

    const todayStr = today.toISOString().split("T")[0];
    const horizonStr = horizon.toISOString().split("T")[0];

    // Query all active contracts expiring within 30 days (non-null end_date)
    const { data: contracts, error: contractsErr } = await supabase
      .from("contracts")
      .select("id, name, tenant_id, account_id, end_date, alert_days_before_expiry")
      .eq("is_active", true)
      .gte("end_date", todayStr)
      .lte("end_date", horizonStr);

    if (contractsErr) throw contractsErr;
    if (!contracts || contracts.length === 0) {
      return new Response(JSON.stringify({ processed: 0, notifications_created: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let notificationsCreated = 0;

    for (const contract of contracts) {
      const endDate = new Date(contract.end_date + "T00:00:00");
      const msPerDay = 24 * 60 * 60 * 1000;
      const daysUntil = Math.round((endDate.getTime() - today.getTime()) / msPerDay);

      // Determine thresholds for this contract
      const thresholds: number[] = contract.alert_days_before_expiry
        ? [contract.alert_days_before_expiry, ...DEFAULT_THRESHOLDS].filter(
            (v, i, arr) => arr.indexOf(v) === i
          )
        : DEFAULT_THRESHOLDS;

      if (!thresholds.includes(daysUntil)) continue;

      // Find all PJ portal access users for this contract's account (pj_id = account_id)
      const { data: accessList, error: accessErr } = await supabase
        .from("pj_portal_access")
        .select("id, user_id, pj_id")
        .eq("pj_id", contract.account_id)
        .eq("tenant_id", contract.tenant_id);

      if (accessErr || !accessList || accessList.length === 0) continue;

      const pjId = contract.account_id;
      const tenantId = contract.tenant_id;
      const notifType = "contract_expiry";
      const title =
        daysUntil === 0
          ? `Contrato vence hoje: ${contract.name}`
          : `Contrato vence em ${daysUntil} dia${daysUntil !== 1 ? "s" : ""}: ${contract.name}`;
      const message = `O contrato "${contract.name}" vence em ${daysUntil} dia${daysUntil !== 1 ? "s" : ""}. Entre em contato com seu gestor para tratar da renovação.`;

      // Idempotency check: one notification per contract per day
      const { data: existing } = await supabase
        .from("pj_notifications")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("pj_id", pjId)
        .eq("type", notifType)
        .eq("related_id", contract.id)
        .gte("created_at", `${todayStr}T00:00:00`)
        .lte("created_at", `${todayStr}T23:59:59`)
        .limit(1);

      if (existing && existing.length > 0) continue;

      const { error: insertErr } = await supabase.from("pj_notifications").insert({
        tenant_id: tenantId,
        pj_id: pjId,
        type: notifType,
        title,
        message,
        related_id: contract.id,
        related_type: "contract",
        is_read: false,
      });

      if (!insertErr) notificationsCreated++;
    }

    return new Response(
      JSON.stringify({ processed: contracts.length, notifications_created: notificationsCreated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[check-contract-expiry]", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
