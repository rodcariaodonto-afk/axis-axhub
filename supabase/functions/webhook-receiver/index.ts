import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-signature",
};

async function verifyHmac(secret: string, payload: string, signature: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const computed = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return computed === signature;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const integrationId = url.searchParams.get("integration_id");
  const webhookId = url.searchParams.get("webhook_id");

  if (!integrationId || !webhookId) {
    return new Response(JSON.stringify({ error: "Missing integration_id or webhook_id" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const startTime = Date.now();
  let rawBody = "";

  try {
    rawBody = await req.text();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Fetch webhook config
  const { data: webhook, error: whError } = await supabase
    .from("integration_webhooks")
    .select("*, integrations!inner(tenant_id, is_active, slug)")
    .eq("id", webhookId)
    .eq("integration_id", integrationId)
    .eq("is_active", true)
    .single();

  if (whError || !webhook) {
    return new Response(JSON.stringify({ error: "Webhook not found or inactive" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const tenantId = (webhook as any).integrations.tenant_id;

  // Validate HMAC signature (REQUIRED — missing signature = unauthorized)
  const signature = req.headers.get("x-webhook-signature");
  if (!signature) {
    await supabase.from("integration_logs").insert({
      integration_id: integrationId,
      tenant_id: tenantId,
      event_type: "webhook.auth_failed",
      action: "receive",
      request_payload: { headers: Object.fromEntries(req.headers.entries()) },
      status: "failed",
      error_message: "Missing x-webhook-signature header",
      duration_ms: Date.now() - startTime,
    });
    return new Response(JSON.stringify({ error: "Missing signature" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  {
    const valid = await verifyHmac(webhook.webhook_secret, rawBody, signature);
    if (!valid) {
      await supabase.from("integration_logs").insert({
        integration_id: integrationId,
        tenant_id: tenantId,
        event_type: "webhook.auth_failed",
        action: "receive",
        request_payload: { headers: Object.fromEntries(req.headers.entries()) },
        status: "failed",
        error_message: "Invalid HMAC signature",
        duration_ms: Date.now() - startTime,
      });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const eventType = (payload.event as string) || "webhook.received";

  // Check event is subscribed
  if (webhook.events && webhook.events.length > 0 && !webhook.events.includes(eventType)) {
    return new Response(JSON.stringify({ status: "ignored", reason: "Event not subscribed" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Fetch field mappings
  const { data: mappings } = await supabase
    .from("integration_mappings")
    .select("*")
    .eq("integration_id", integrationId)
    .eq("tenant_id", tenantId);

  // Apply mappings
  const mappedData: Record<string, unknown> = {};
  if (mappings && mappings.length > 0) {
    for (const m of mappings) {
      const value = (payload as Record<string, unknown>)[m.external_field];
      if (value !== undefined) {
        mappedData[m.axhub_field] = value;
      }
    }
  }

  // Log the event
  await supabase.from("integration_logs").insert({
    integration_id: integrationId,
    tenant_id: tenantId,
    event_type: eventType,
    action: "receive",
    request_payload: payload,
    response_payload: mappedData,
    status: "success",
    duration_ms: Date.now() - startTime,
  });

  // Update webhook last_triggered_at
  await supabase
    .from("integration_webhooks")
    .update({ last_triggered_at: new Date().toISOString(), failed_attempts: 0 })
    .eq("id", webhookId);

  return new Response(
    JSON.stringify({ status: "ok", event: eventType, mapped_fields: Object.keys(mappedData).length }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
