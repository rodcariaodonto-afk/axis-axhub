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
  messageType: string,
  base64Data?: string | null,
  mimetype?: string | null
): Promise<string | null> {
  try {
    let uint8Array: Uint8Array;
    let contentType: string;

    // Try base64 first if available (more reliable than URL)
    if (base64Data) {
      console.log("Using base64 data for media upload, type:", mimetype);
      // Remove data URI prefix if present
      const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, "");
      const binaryStr = atob(cleanBase64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      uint8Array = bytes;
      contentType = mimetype || "application/octet-stream";
    } else {
      // Fall back to URL download
      console.log("Downloading media from:", mediaUrl.substring(0, 100));
      const response = await fetch(mediaUrl);
      if (!response.ok) {
        console.error("Failed to download media:", response.status);
        return null;
      }
      contentType = response.headers.get("content-type") || "application/octet-stream";
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      uint8Array = new Uint8Array(arrayBuffer);
    }

    const extMap: Record<string, string> = {
      "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
      "audio/ogg": "ogg", "audio/ogg; codecs=opus": "ogg", "audio/mpeg": "mp3", "audio/mp4": "m4a",
      "video/mp4": "mp4", "video/3gpp": "3gp",
      "application/pdf": "pdf",
    };
    const ext = extMap[contentType] || (messageType === "image" ? "jpg" : messageType === "audio" ? "ogg" : messageType === "video" ? "mp4" : "bin");

    const filePath = `${tenantId}/${messageId}.${ext}`;
    console.log("Uploading to storage:", filePath, "size:", uint8Array.length);

    const { error: uploadError } = await supabase.storage
      .from("whatsapp-media")
      .upload(filePath, uint8Array, {
        contentType: contentType.split(";")[0].trim(),
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

async function fetchGroupName(
  supabase: any,
  tenantId: string,
  instanceName: string,
  groupJid: string
): Promise<string | null> {
  try {
    // Get tenant WhatsApp settings for Evolution API credentials
    const { data: settings } = await supabase
      .from("whatsapp_settings")
      .select("evolution_api_url, evolution_api_key")
      .eq("tenant_id", tenantId)
      .single();

    if (!settings?.evolution_api_url || !settings?.evolution_api_key) {
      // Try env vars as fallback
      const evolutionUrl = settings?.evolution_api_url || Deno.env.get("EVOLUTION_API_URL");
      const evolutionKey = settings?.evolution_api_key || Deno.env.get("EVOLUTION_API_KEY");
      if (!evolutionUrl || !evolutionKey) {
        console.log("No Evolution API credentials found for group name fetch");
        return null;
      }
      return await callGroupApi(evolutionUrl, evolutionKey, instanceName, groupJid);
    }

    return await callGroupApi(settings.evolution_api_url, settings.evolution_api_key, instanceName, groupJid);
  } catch (err) {
    console.error("Error fetching group name:", err);
    return null;
  }
}

async function callGroupApi(
  evolutionUrl: string,
  evolutionKey: string,
  instanceName: string,
  groupJid: string
): Promise<string | null> {
  const url = `${evolutionUrl}/group/findGroupInfos/${instanceName}?groupJid=${groupJid}`;
  console.log("Fetching group info from:", url);
  const resp = await fetch(url, {
    headers: { apikey: evolutionKey },
  });
  if (!resp.ok) {
    console.error("Group info fetch failed:", resp.status);
    return null;
  }
  const data = await resp.json();
  const subject = data?.subject || data?.groupMetadata?.subject || null;
  console.log("Group name fetched:", subject);
  return subject;
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

        const participantRaw = key.participantAlt || key.participant;
        const participant = isGroup ? (participantRaw?.split("@")[0] || null) : null;

        // Skip reaction messages
        if (msg?.messageType === "reactionMessage" || msg?.message?.reactionMessage) {
          console.log("Skipping reaction message");
          continue;
        }

        // Extract group name from payload
        let groupName: string | null = null;
        if (isGroup) {
          groupName = data?.groupMetadata?.subject
            || msg?.groupMetadata?.subject
            || msg?.messageStubParameters?.[0]
            || null;
        }

        // Extract media URL
        const imgMsg = msg?.message?.imageMessage;
        const audioMsg = msg?.message?.audioMessage;
        const videoMsg = msg?.message?.videoMessage;
        const docMsg = msg?.message?.documentMessage;
        const stickerMsg = msg?.message?.stickerMessage;

        const mediaUrl = imgMsg?.url || audioMsg?.url || videoMsg?.url || docMsg?.url || stickerMsg?.url || null;
        const caption = imgMsg?.caption || videoMsg?.caption || docMsg?.caption || null;
        const mediaMimetype = imgMsg?.mimetype || audioMsg?.mimetype || videoMsg?.mimetype || docMsg?.mimetype || stickerMsg?.mimetype || null;
        
        // Try to get base64 from the message payload (Evolution API sometimes includes it)
        const mediaBase64 = msg?.message?.base64 || data?.base64 || null;

        const textContent = msg?.message?.conversation ||
          msg?.message?.extendedTextMessage?.text ||
          caption ||
          null;

        const messageType = imgMsg ? "image" :
          audioMsg ? "audio" :
          videoMsg ? "video" :
          docMsg ? "document" :
          stickerMsg ? "sticker" : "text";

        const msgId = key.id || crypto.randomUUID();

        // Build content
        let messageContent: string;
        if ((mediaUrl || mediaBase64) && messageType !== "text") {
          const permanentUrl = await downloadAndUploadMedia(supabase, mediaUrl || "", tenantId, msgId, messageType, mediaBase64, mediaMimetype);
          if (permanentUrl) {
            messageContent = JSON.stringify({ url: permanentUrl, caption: caption || null });
          } else if (mediaUrl) {
            messageContent = JSON.stringify({ url: mediaUrl, caption: caption || null });
          } else {
            messageContent = caption || "[media]";
          }
        } else {
          messageContent = textContent || "[media]";
        }

        // Upsert contact
        const { data: existingContact } = await supabase
          .from("whatsapp_contacts")
          .select("id, unread_count, display_name")
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
          if (!isGroup && msg?.pushName) {
            updateData.display_name = msg.pushName;
          }
          // Update group name: from payload or fetch from API if still generic
          if (isGroup) {
            if (groupName) {
              updateData.display_name = groupName;
            } else if (
              existingContact.display_name &&
              (existingContact.display_name.startsWith("Grupo ") || existingContact.display_name === phone)
            ) {
              // Try to fetch real group name from Evolution API
              const realName = await fetchGroupName(supabase, tenantId, instanceName, `${phone}@g.us`);
              if (realName) {
                updateData.display_name = realName;
                console.log("Updated group name from API:", realName);
              }
            }
          }
          await supabase
            .from("whatsapp_contacts")
            .update(updateData)
            .eq("id", contactId);
        } else {
          let displayName = isGroup
            ? (groupName || `Grupo ${phone}`)
            : (msg?.pushName || phone);

          // For new groups without a name from payload, try API
          if (isGroup && !groupName) {
            const realName = await fetchGroupName(supabase, tenantId, instanceName, `${phone}@g.us`);
            if (realName) {
              displayName = realName;
              console.log("New group name from API:", realName);
            }
          }

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

          // Auto-create status
          await supabase.from("whatsapp_contact_status").insert({
            tenant_id: tenantId,
            contact_id: contactId,
            status: isGroup ? "group" : "open",
          });
        }

        // Auto-status: inbound individual message -> "waiting"
        if (!isFromMe && !isGroup) {
          const { data: currentStatus } = await supabase
            .from("whatsapp_contact_status")
            .select("id, status")
            .eq("contact_id", contactId)
            .single();

          if (currentStatus) {
            if (currentStatus.status === "open" || currentStatus.status === "closed" || currentStatus.status === "attending") {
              await supabase.from("whatsapp_contact_status")
                .update({ status: "waiting", last_status_change: new Date().toISOString() })
                .eq("id", currentStatus.id);
              console.log("Auto-status: changed to waiting for contact:", contactId);
            }
          }
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

        // Check campaign response and resume funnel executions
        if (!isFromMe) {
          // Check for funnel executions waiting for a response (aguardar_resposta)
          // Match by phone (with or without country code prefix)
          const phoneVariants = [phone];
          if (phone.startsWith("55") && phone.length >= 12) {
            phoneVariants.push(phone.substring(2)); // without country code
          } else if (phone.length >= 10 && phone.length <= 11) {
            phoneVariants.push("55" + phone); // with country code
          }

          const { data: waitingExecutions } = await supabase
            .from("funis_execucoes")
            .select("id, bloco_atual_id, tenant_id, funil_id, contato_telefone")
            .in("contato_telefone", phoneVariants)
            .eq("status", "em_andamento")
            .eq("tenant_id", tenantId);

          if (waitingExecutions && waitingExecutions.length > 0) {
            for (const exec of waitingExecutions) {
              // Check if current block is aguardar_resposta
              const { data: currentBlock } = await supabase
                .from("funis_blocos")
                .select("tipo")
                .eq("id", exec.bloco_atual_id)
                .single();

              if (currentBlock?.tipo === "aguardar_resposta") {
                // Atomic lock: only advance if bloco_atual_id still matches (prevents double-send)
                const { data: updated, error: updateErr } = await supabase
                  .from("funis_execucoes")
                  .update({ bloco_atual_id: exec.bloco_atual_id }) // no-op update to "lock"
                  .eq("id", exec.id)
                  .eq("bloco_atual_id", exec.bloco_atual_id)
                  .select("id");

                if (!updated || updated.length === 0) {
                  console.log(`Execution ${exec.id} already advanced by another webhook, skipping`);
                  continue;
                }

                console.log(`Resuming funnel execution ${exec.id} for phone ${phone}`);

                // Save the response as a variable
                await supabase.from("funis_variaveis").upsert({
                  execucao_id: exec.id,
                  chave: "resposta",
                  valor: messageContent,
                  tenant_id: tenantId,
                }, { onConflict: "execucao_id,chave" }).select();

                // Log the response received
                await supabase.from("funis_logs").insert({
                  tenant_id: tenantId,
                  execucao_id: exec.id,
                  bloco_id: exec.bloco_atual_id,
                  bloco_tipo: "aguardar_resposta",
                  status: "executado",
                  detalhes: { message: "Response received", response_preview: messageContent.substring(0, 200) },
                });

                // Advance to next block
                const { data: nextConn } = await supabase
                  .from("funis_conexoes")
                  .select("target_bloco_id")
                  .eq("funil_id", exec.funil_id)
                  .eq("source_bloco_id", exec.bloco_atual_id)
                  .limit(1)
                  .maybeSingle();

                if (nextConn) {
                  await supabase.from("funis_execucoes")
                    .update({ bloco_atual_id: nextConn.target_bloco_id })
                    .eq("id", exec.id);

                  // Call process-funnel-block to continue the flow
                  const processUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/process-funnel-block`;
                  fetch(processUrl, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                    },
                    body: JSON.stringify({
                      execucao_id: exec.id,
                      bloco_id: nextConn.target_bloco_id,
                      tenant_id: tenantId,
                    }),
                  }).catch(err => console.error("Error calling process-funnel-block:", err));
                } else {
                  // No next block, mark as completed
                  await supabase.from("funis_execucoes")
                    .update({ status: "concluido", finished_at: new Date().toISOString() })
                    .eq("id", exec.id);
                }
              }
            }
          }

          // ── Check for paused Workflow executions (wait_for_whatsapp_reply) ──
          const { data: waitingWorkflows } = await supabase
            .from("workflow_waiting_states")
            .select("id, execution_id, tenant_id")
            .in("phone", phoneVariants)
            .eq("status", "waiting")
            .eq("tenant_id", tenantId);

          if (waitingWorkflows && waitingWorkflows.length > 0) {
            for (const ws of waitingWorkflows) {
              console.log(`Resuming workflow execution ${ws.execution_id} for phone ${phone}`);
              const runnerUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/workflow-runner`;
              fetch(runnerUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                },
                body: JSON.stringify({
                  resume_execution_id: ws.execution_id,
                  whatsapp_reply: messageContent,
                }),
              }).catch(err => console.error("Error resuming workflow:", err));
            }
          }

          // Check campaign contact status
          const { data: campaignContact } = await supabase
            .from("campanhas_contatos")
            .select("id, campanha_id")
            .in("telefone", phoneVariants)
            .eq("status", "enviado")
            .limit(1)
            .maybeSingle();

          if (campaignContact) {
            await supabase.from("campanhas_contatos").update({ status: "respondeu" }).eq("id", campaignContact.id);
            await supabase.from("fluxo_recebimento_logs").insert({
              tenant_id: tenantId,
              campanha_id: campaignContact.campanha_id,
              telefone: phone,
              mensagem_recebida: messageContent,
              status_fluxo: "recebido",
            });
          }
        }

        console.log("Message saved:", isFromMe ? "outbound" : "inbound", "phone:", phone, "type:", messageType, "hasMedia:", !!mediaUrl);

        // Sync to CRM
        try {
          const syncUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/sync-whatsapp-contact-to-crm`;
          await fetch(syncUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
            body: JSON.stringify({
              tenant_id: tenantId,
              phone,
              display_name: msg?.pushName || null,
              message: messageContent,
              message_type: messageType,
              direction: isFromMe ? "outbound" : "inbound",
              whatsapp_message_id: key.id,
            }),
          });
        } catch (syncErr) {
          console.error("CRM sync error (non-blocking):", syncErr);
        }
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
