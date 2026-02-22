import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { event, instance, data } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find session by instance name
    const instanceName = instance || body?.instanceName || body?.instance?.instanceName;
    if (!instanceName) {
      return new Response(JSON.stringify({ error: "No instance identifier" }), { status: 400, headers: corsHeaders });
    }

    const { data: session } = await supabase
      .from("whatsapp_sessions")
      .select("*")
      .eq("evolution_instance_id", instanceName)
      .single();

    if (!session) {
      console.log("Session not found for instance:", instanceName);
      return new Response(JSON.stringify({ ok: true, skipped: true }), { headers: corsHeaders });
    }

    const tenantId = session.tenant_id;

    // Handle events
    if (event === "qrcode.updated" || event === "QRCODE_UPDATED") {
      const qrCode = data?.qrcode?.base64 || data?.base64;
      if (qrCode) {
        await supabase
          .from("whatsapp_sessions")
          .update({ qr_code: qrCode, status: "qr_pending" })
          .eq("id", session.id);
      }
    } else if (event === "connection.update" || event === "CONNECTION_UPDATE") {
      const state = data?.state || data?.status;
      let status = "disconnected";
      if (state === "open" || state === "connected") status = "connected";
      else if (state === "close" || state === "disconnected") status = "disconnected";
      else if (state === "connecting") status = "qr_pending";

      const updateData: Record<string, unknown> = { status };
      if (status === "connected") {
        updateData.last_connected_at = new Date().toISOString();
        updateData.qr_code = null;
        updateData.error_message = null;
        if (data?.instance?.wuid) {
          updateData.phone_number = data.instance.wuid.split("@")[0];
        }
      }

      await supabase.from("whatsapp_sessions").update(updateData).eq("id", session.id);
    } else if (event === "messages.upsert" || event === "MESSAGES_UPSERT") {
      const messages = Array.isArray(data) ? data : [data];

      for (const msg of messages) {
        const key = msg?.key;
        if (!key || key.fromMe) continue; // skip outbound echoes

        const phone = key.remoteJid?.split("@")[0];
        if (!phone || phone === "status") continue;

        const messageContent = msg?.message?.conversation ||
          msg?.message?.extendedTextMessage?.text ||
          msg?.message?.imageMessage?.caption ||
          "[media]";

        const messageType = msg?.message?.imageMessage ? "image" :
          msg?.message?.audioMessage ? "audio" :
          msg?.message?.videoMessage ? "video" :
          msg?.message?.documentMessage ? "document" : "text";

        // Upsert contact
        const { data: existingContact } = await supabase
          .from("whatsapp_contacts")
          .select("id")
          .eq("session_id", session.id)
          .eq("phone_number", phone)
          .single();

        let contactId: string;
        if (existingContact) {
          contactId = existingContact.id;
          await supabase
            .from("whatsapp_contacts")
            .update({
              last_message_at: new Date().toISOString(),
              unread_count: (existingContact as any).unread_count + 1 || 1,
              display_name: msg?.pushName || undefined,
            })
            .eq("id", contactId);
        } else {
          const { data: newContact } = await supabase
            .from("whatsapp_contacts")
            .insert({
              tenant_id: tenantId,
              session_id: session.id,
              phone_number: phone,
              display_name: msg?.pushName || phone,
              last_message_at: new Date().toISOString(),
              unread_count: 1,
            })
            .select("id")
            .single();
          contactId = newContact!.id;
        }

        // Insert message
        await supabase.from("whatsapp_messages").insert({
          tenant_id: tenantId,
          session_id: session.id,
          contact_id: contactId,
          contact_phone: phone,
          message_type: messageType,
          content: messageContent,
          direction: "inbound",
          status: "received",
          whatsapp_message_id: key.id,
          sender_name: msg?.pushName || null,
          sender_phone: phone,
        });
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
