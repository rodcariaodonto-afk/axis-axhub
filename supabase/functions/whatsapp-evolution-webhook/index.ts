import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    console.log("Webhook received:", JSON.stringify(body).substring(0, 2000));

    const event = body.event || body.action;
    const instanceName =
      typeof body.instance === "string" ? body.instance :
      body.instance?.instanceName ||
      body.instanceName ||
      body.data?.instance?.instanceName;

    console.log("Parsed event:", event, "instance:", instanceName);

    if (!instanceName) {
      console.log("No instance identifier found in payload");
      return new Response(JSON.stringify({ error: "No instance identifier" }), { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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
    const data = body.data || body;
    console.log("Processing event:", event, "for session:", session.id);

    // Handle QR code events
    if (event === "qrcode.updated" || event === "QRCODE_UPDATED") {
      const qrCode = data?.qrcode?.base64 || data?.base64 || data?.qrcode;
      console.log("QR code received, length:", qrCode?.length || 0);
      if (qrCode) {
        await supabase
          .from("whatsapp_sessions")
          .update({ qr_code: qrCode, status: "qr_pending" })
          .eq("id", session.id);
        console.log("QR code updated in DB");
      }
    }
    // Handle connection events
    else if (event === "connection.update" || event === "CONNECTION_UPDATE") {
      const state = data?.state || data?.status || data?.instance?.state || data?.statusReason;
      console.log("Connection state:", state, "full data:", JSON.stringify(data).substring(0, 500));

      let status = "disconnected";
      if (state === "open" || state === "connected") status = "connected";
      else if (state === "close" || state === "disconnected") status = "disconnected";
      else if (state === "connecting" || state === "qr") status = "qr_pending";

      const updateData: Record<string, unknown> = { status };
      if (status === "connected") {
        updateData.last_connected_at = new Date().toISOString();
        updateData.qr_code = null;
        updateData.error_message = null;
        const wuid = data?.instance?.wuid || data?.wuid;
        if (wuid) {
          updateData.phone_number = wuid.split("@")[0];
        }
      }

      console.log("Updating session status to:", status);
      await supabase.from("whatsapp_sessions").update(updateData).eq("id", session.id);
    }
    // Handle message events
    else if (event === "messages.upsert" || event === "MESSAGES_UPSERT") {
      const messages = Array.isArray(data) ? data : data?.messages ? data.messages : [data];
      console.log("Processing", messages.length, "messages");

      for (const msg of messages) {
        const key = msg?.key;
        if (!key) continue;

        const isFromMe = key.fromMe === true;
        const phone = key.remoteJid?.split("@")[0];
        if (!phone || phone === "status") continue;

        // Extract media URL from Evolution API payload
        const imgMsg = msg?.message?.imageMessage;
        const audioMsg = msg?.message?.audioMessage;
        const videoMsg = msg?.message?.videoMessage;
        const docMsg = msg?.message?.documentMessage;
        const stickerMsg = msg?.message?.stickerMessage;

        const mediaUrl = imgMsg?.url || audioMsg?.url || videoMsg?.url || docMsg?.url || stickerMsg?.url || null;
        const caption = imgMsg?.caption || videoMsg?.caption || docMsg?.caption || null;

        const textContent = msg?.message?.conversation ||
          msg?.message?.extendedTextMessage?.text ||
          caption ||
          null;

        const messageType = imgMsg ? "image" :
          audioMsg ? "audio" :
          videoMsg ? "video" :
          docMsg ? "document" :
          stickerMsg ? "sticker" : "text";

        // Build content: for media, store JSON with url and caption; for text, store text
        let messageContent: string;
        if (mediaUrl && messageType !== "text") {
          messageContent = JSON.stringify({ url: mediaUrl, caption: caption || null });
        } else {
          messageContent = textContent || "[media]";
        }

        // Upsert contact
        const { data: existingContact } = await supabase
          .from("whatsapp_contacts")
          .select("id, unread_count")
          .eq("session_id", session.id)
          .eq("phone_number", phone)
          .single();

        let contactId: string;
        if (existingContact) {
          contactId = existingContact.id;
          const updateData: Record<string, unknown> = {
            last_message_at: new Date().toISOString(),
          };
          if (!isFromMe) {
            updateData.unread_count = (existingContact.unread_count || 0) + 1;
          }
          if (msg?.pushName) {
            updateData.display_name = msg.pushName;
          }
          await supabase
            .from("whatsapp_contacts")
            .update(updateData)
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
              unread_count: isFromMe ? 0 : 1,
            })
            .select("id")
            .single();
          contactId = newContact!.id;

          // Auto-create open status for new contacts
          await supabase.from("whatsapp_contact_status").insert({
            tenant_id: tenantId,
            contact_id: contactId,
            status: "open",
          });
        }

        // Insert message
        await supabase.from("whatsapp_messages").insert({
          tenant_id: tenantId,
          session_id: session.id,
          contact_id: contactId,
          contact_phone: phone,
          message_type: messageType,
          content: messageContent,
          direction: isFromMe ? "outbound" : "inbound",
          status: isFromMe ? "sent" : "received",
          whatsapp_message_id: key.id,
          sender_name: msg?.pushName || null,
          sender_phone: isFromMe ? session.phone_number : phone,
        });
        console.log("Message saved:", isFromMe ? "outbound" : "inbound", "phone:", phone, "type:", messageType, "hasMedia:", !!mediaUrl);
      }
    } else {
      console.log("Unhandled event:", event);
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
