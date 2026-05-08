import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub;

    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", userId).single();
    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), { status: 404, headers: corsHeaders });
    }

    const url = new URL(req.url);
    let sessionId = url.searchParams.get("session_id");
    
    // Also accept session_id from POST body
    if (!sessionId && req.method === "POST") {
      try {
        const body = await req.json();
        sessionId = body.session_id;
      } catch {}
    }
    
    if (!sessionId) {
      return new Response(JSON.stringify({ error: "session_id required" }), { status: 400, headers: corsHeaders });
    }

    const { data: session } = await supabase
      .from("whatsapp_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("tenant_id", profile.tenant_id)
      .single();

    if (!session) {
      return new Response(JSON.stringify({ error: "Session not found" }), { status: 404, headers: corsHeaders });
    }

    // Get settings
    const { data: settings } = await supabase
      .from("whatsapp_settings")
      .select("evolution_api_url, evolution_api_key")
      .eq("tenant_id", profile.tenant_id)
      .single();

    const evolutionUrl = settings?.evolution_api_url || Deno.env.get("EVOLUTION_API_URL");
    const evolutionKey = settings?.evolution_api_key || Deno.env.get("EVOLUTION_API_KEY");

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check instance status from Evolution API
    let instanceStatus = session.status;
    try {
      const statusRes = await fetch(
        `${evolutionUrl}/instance/connectionState/${session.evolution_instance_id}`,
        { headers: { apikey: evolutionKey! } }
      );
      const statusData = await statusRes.json();
      console.log("Instance status:", JSON.stringify(statusData));

      const state = statusData?.instance?.state || statusData?.state;
      if (state === "open" || state === "connected") {
        instanceStatus = "connected";
        await serviceClient
          .from("whatsapp_sessions")
          .update({
            status: "connected",
            last_connected_at: new Date().toISOString(),
            qr_code: null,
            error_message: null,
          })
          .eq("id", sessionId);

        // Ensure webhook is configured for this instance
        const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/whatsapp-evolution-webhook`;
        try {
          // Try v2 format with webhook wrapper
          await fetch(`${evolutionUrl}/webhook/set/${session.evolution_instance_id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", apikey: evolutionKey! },
            body: JSON.stringify({
              webhook: {
                enabled: true,
                url: webhookUrl,
                byEvents: false,
                base64: true,
                events: ["QRCODE_UPDATED", "CONNECTION_UPDATE", "MESSAGES_UPSERT", "SEND_MESSAGE"],
              },
            }),
          });
          console.log("Webhook configured for connected instance");
        } catch (whErr) {
          console.error("Webhook set error:", whErr);
        }

        // Fetch contacts from Evolution API and sync to DB
        try {
          const contactsRes = await fetch(
            `${evolutionUrl}/chat/findContacts/${session.evolution_instance_id}`,
            { 
              method: "POST",
              headers: { "Content-Type": "application/json", apikey: evolutionKey! },
              body: JSON.stringify({}),
            }
          );
          if (contactsRes.ok) {
            const contactsData = await contactsRes.json();
            console.log("Fetched contacts count:", Array.isArray(contactsData) ? contactsData.length : 0);
            
            if (Array.isArray(contactsData)) {
              for (const contact of contactsData.slice(0, 100)) {
                const phone = contact.id?.split("@")[0];
                if (!phone || phone === "status" || contact.id?.includes("@g.us")) continue;
                
                const displayName = contact.pushName || contact.name || phone;
                
                // Upsert contact
                const { data: existing } = await serviceClient
                  .from("whatsapp_contacts")
                  .select("id")
                  .eq("session_id", sessionId)
                  .eq("phone_number", phone)
                  .single();

                if (!existing) {
                  await serviceClient.from("whatsapp_contacts").insert({
                    tenant_id: profile.tenant_id,
                    session_id: sessionId,
                    phone_number: phone,
                    display_name: displayName,
                    last_message_at: new Date().toISOString(),
                    unread_count: 0,
                  });
                }
              }
            }
          }
        } catch (contactErr) {
          console.error("Contacts fetch error:", contactErr);
        }
        
        return new Response(JSON.stringify({
          qr_code: null,
          status: "connected",
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    } catch (statusErr) {
      console.error("Status check error:", statusErr);
    }

    // Fetch QR from Evolution
    const evolutionRes = await fetch(
      `${evolutionUrl}/instance/connect/${session.evolution_instance_id}`,
      { headers: { apikey: evolutionKey! } }
    );
    const evolutionData = await evolutionRes.json();
    console.log("Connect response keys:", Object.keys(evolutionData));

    // Update QR in DB
    if (evolutionData?.base64) {
      await serviceClient
        .from("whatsapp_sessions")
        .update({ qr_code: evolutionData.base64, status: "qr_pending" })
        .eq("id", sessionId);
    }

    return new Response(JSON.stringify({
      qr_code: evolutionData?.base64 || session.qr_code,
      status: instanceStatus,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("get-whatsapp-qr error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
