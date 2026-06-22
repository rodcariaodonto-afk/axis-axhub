import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Retry delays in milliseconds (for next_retry_at storage — actual retry must be triggered externally)
const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 30 * 60_000]; // 1min, 5min, 30min
const MAX_ATTEMPTS = 3;

async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface DispatchBody {
  event: string;
  payload: Record<string, unknown>;
  tenant_id: string;
  attempt?: number;          // for retries
  webhook_id?: string;       // for targeted retry of a single webhook
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  let body: DispatchBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { event, payload, tenant_id, attempt = 1, webhook_id } = body;

  if (!event || !tenant_id) {
    return new Response(
      JSON.stringify({ error: "Campos obrigatórios: event, tenant_id" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── Fetch target webhooks ─────────────────────────────────────────────────
  let whQuery = (sb as any)
    .from("integration_webhooks")
    .select("id,webhook_url,webhook_secret,events,failed_attempts")
    .eq("tenant_id", tenant_id)
    .eq("is_active", true)
    .contains("events", [event]);

  if (webhook_id) whQuery = whQuery.eq("id", webhook_id);

  const { data: webhooks, error: whErr } = await whQuery;

  if (whErr) {
    console.error("[dispatch-webhook] fetch error:", whErr);
    return new Response(JSON.stringify({ error: whErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!webhooks || webhooks.length === 0) {
    return new Response(
      JSON.stringify({ ok: true, dispatched: 0, message: "No active webhooks for this event" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const timestamp = new Date().toISOString();
  const payloadStr = JSON.stringify({ event, payload, timestamp });
  let dispatched = 0;

  for (const wh of webhooks) {
    const signature = await hmacSha256Hex(wh.webhook_secret, payloadStr);

    let responseStatus: number | null = null;
    let responseBody: string | null = null;
    let deliveredAt: string | null = null;
    let success = false;

    try {
      const resp = await fetch(wh.webhook_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Event":     event,
          "X-Webhook-Signature": signature,
          "X-Webhook-Timestamp": timestamp,
          "X-Webhook-Attempt":   String(attempt),
        },
        body: payloadStr,
        signal: AbortSignal.timeout(10_000), // 10s timeout
      });

      responseStatus = resp.status;
      responseBody   = await resp.text().catch(() => null);
      success        = resp.ok;
      if (success) deliveredAt = new Date().toISOString();
    } catch (fetchErr: any) {
      responseBody = fetchErr?.message ?? "Fetch failed";
    }

    // ── Log delivery ────────────────────────────────────────────────────────
    let nextRetryAt: string | null = null;
    if (!success && attempt < MAX_ATTEMPTS) {
      const delayMs = RETRY_DELAYS_MS[attempt - 1] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
      nextRetryAt = new Date(Date.now() + delayMs).toISOString();
    }

    await (sb as any).from("webhook_delivery_logs").insert({
      tenant_id,
      webhook_id:      wh.id,
      event,
      payload:         { event, payload, timestamp },
      response_status: responseStatus,
      response_body:   responseBody?.slice(0, 1000) ?? null,
      attempt,
      delivered_at:    deliveredAt,
      next_retry_at:   nextRetryAt,
    });

    // ── Update webhook stats ────────────────────────────────────────────────
    if (success) {
      await (sb as any)
        .from("integration_webhooks")
        .update({ last_triggered_at: new Date().toISOString(), failed_attempts: 0 })
        .eq("id", wh.id);
      dispatched++;
    } else {
      const newFailedAttempts = (wh.failed_attempts ?? 0) + 1;
      const shouldDeactivate  = newFailedAttempts >= MAX_ATTEMPTS;

      await (sb as any)
        .from("integration_webhooks")
        .update({
          failed_attempts: newFailedAttempts,
          ...(shouldDeactivate ? { is_active: false } : {}),
        })
        .eq("id", wh.id);

      if (shouldDeactivate) {
        console.warn(`[dispatch-webhook] deactivated webhook ${wh.id} after ${MAX_ATTEMPTS} failures`);
      }

      // Schedule retry by invoking self (fire-and-forget) if next_retry_at was set
      if (nextRetryAt && attempt < MAX_ATTEMPTS) {
        // We can't actually delay here in edge functions, so the caller (cron/trigger) must
        // check webhook_delivery_logs for next_retry_at and re-invoke.
        // Log is sufficient for external retry orchestration.
        console.log(`[dispatch-webhook] retry scheduled for ${nextRetryAt}, webhook=${wh.id}`);
      }
    }
  }

  return new Response(
    JSON.stringify({ ok: true, dispatched, total: webhooks.length }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
