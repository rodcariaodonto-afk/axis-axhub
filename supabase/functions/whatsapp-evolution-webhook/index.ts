import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function downloadAndUploadMedia(
  supabase: any,
  mediaUrl: string,
  tenantId: string,
  messageId: string,
  messageType: string
): Promise<string | null> {
  try {
    console.log("Downloading media from:", mediaUrl.substring(0, 100));
    const response = await fetch(mediaUrl);
    if (!response.ok) {
      console.error("Failed to download media:", response.status);
      return null;
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Determine file extension from content type
    const extMap: Record<string, string> = {
      "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
      "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/mp4": "m4a",
      "video/mp4": "mp4", "video/3gpp": "3gp",
      "application/pdf": "pdf",
    };
    const ext = extMap[contentType] || messageType === "image" ? "jpg" : messageType === "audio" ? "ogg" : messageType === "video" ? "mp4" : "bin";

    const filePath = `${tenantId}/${messageId}.${ext}`;
    console.log("Uploading to storage:", filePath, "size:", uint8Array.length);

    const { error: uploadError } = await supabase.storage
      .from("whatsapp-media")
      .upload(filePath, uint8Array, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError.message);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from("whatsapp-media")
      .getPublicUrl(filePath);

    console.log("Media uploaded, public URL:", publicUrlData.publicUrl);
    return publicUrlData.publicUrl;
  } catch (err) {
    console.error("Media download/upload error:", err);
    return null;
  }
}

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
        const isGroup = key.remoteJid?.endsWith("@g.us") === true;
        const phone = key.remoteJid?.split("@")[0];
        if (!phone || phone === "status") continue;

        const participant = isGroup ? (key.participant?.split("@")[0] || null) : null;

        // Extract group name from various possible locations in the payload
        let groupName: string | null = null;
        if (isGroup) {
          groupName = data?.groupMetadata?.subject
            || msg?.groupMetadata?.subject
            || msg?.messageStubParameters?.[0]
            || null;
        }

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

        // Generate a unique message ID for storage path
        const msgId = key.id || crypto.randomUUID();

        // Build content: for media, download and upload to permanent storage
        let messageContent: string;
        if (mediaUrl && messageType !== "text") {
          const permanentUrl = await downloadAndUploadMedia(supabase, mediaUrl, tenantId, msgId, messageType);
          if (permanentUrl) {
            messageContent = JSON.stringify({ url: permanentUrl, caption: caption || null });
          } else {
            // Fallback: store original URL if download fails
            messageContent = JSON.stringify({ url: mediaUrl, caption: caption || null });
          }
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
          // Only update display_name with pushName for individual contacts, NOT groups
          if (!isGroup && msg?.pushName) {
            updateData.display_name = msg.pushName;
          }
          // Update group name if we got a new one
          if (isGroup && groupName) {
            updateData.display_name = groupName;
          }
          await supabase
            .from("whatsapp_contacts")
            .update(updateData)
            .eq("id", contactId);
        } else {
          // For groups: use group name or JID as display_name; for individuals: use pushName
          const displayName = isGroup
            ? (groupName || `Grupo ${phone}`)
            : (msg?.pushName || phone);

          const { data: newContact } = await supabase
            .from("whatsapp_contacts")
            .insert({
              tenant_id: tenantId,
              session_id: session.id,
              phone_number: phone,
              display_name: displayName,
              last_message_at: new Date().toISOString(),
              unread_count: isFromMe ? 0 : 1,
              is_group: isGroup,
            })
            .select("id")
            .single();
          contactId = newContact!.id;

          // Auto-create status: "group" for groups, "open" for individuals
          await supabase.from("whatsapp_contact_status").insert({
            tenant_id: tenantId,
            contact_id: contactId,
            status: isGroup ? "group" : "open",
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
          sender_phone: isGroup ? (isFromMe ? session.phone_number : participant) : (isFromMe ? session.phone_number : phone),
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
