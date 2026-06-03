import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Require cron secret OR service-role bearer
  const cronSecret = Deno.env.get("CRON_SECRET");
  const providedSecret = req.headers.get("x-cron-secret");
  const authHeader = req.headers.get("Authorization") ?? "";
  const isServiceRoleCall = authHeader === `Bearer ${serviceRoleKey}`;
  const isCronCall = !!cronSecret && providedSecret === cronSecret;
  if (!isServiceRoleCall && !isCronCall) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const webhookUrl = Deno.env.get("N8N_WEBHOOK_URL");
  const n8nToken = Deno.env.get("N8N_TOKEN");

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Fetch pending events (max 20)
  const { data: events, error: fetchError } = await supabase
    .from("event_outbox")
    .select("*")
    .eq("status", "pending")
    .lt("retry_count", 5)
    .order("created_at", { ascending: true })
    .limit(20);

  if (fetchError) {
    return new Response(JSON.stringify({ error: fetchError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!events || events.length === 0) {
    return new Response(JSON.stringify({ processed: 0, message: "No pending events" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!webhookUrl) {
    return new Response(JSON.stringify({ processed: 0, message: "N8N_WEBHOOK_URL not configured. Events remain pending." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let processed = 0;
  let failed = 0;

  for (const event of events) {
    try {
      const payload = {
        event: event.event_name,
        timestamp: event.created_at,
        tenant_id: event.tenant_id,
        actor_user_id: event.actor_user_id,
        data: event.payload,
      };

      const headers: Record<string, string> = { "Content-Type": "application/json", "X-Tenant-ID": event.tenant_id };
      if (n8nToken) headers["Authorization"] = `Bearer ${n8nToken}`;

      const res = await fetch(webhookUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await supabase
          .from("event_outbox")
          .update({ status: "processed", processed_at: new Date().toISOString() })
          .eq("id", event.id);
        processed++;
      } else {
        const newRetry = (event.retry_count || 0) + 1;
        await supabase
          .from("event_outbox")
          .update({ retry_count: newRetry, status: newRetry >= 5 ? "failed" : "pending" })
          .eq("id", event.id);
        failed++;
      }
    } catch {
      const newRetry = (event.retry_count || 0) + 1;
      await supabase
        .from("event_outbox")
        .update({ retry_count: newRetry, status: newRetry >= 5 ? "failed" : "pending" })
        .eq("id", event.id);
      failed++;
    }
  }

  return new Response(JSON.stringify({ processed, failed, total: events.length }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
