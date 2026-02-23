import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelay(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function processContacts(
  serviceClient: any,
  campaign: any,
  contacts: any[],
  config: any,
  tenantId: string,
  session: any,
  evolutionUrl: string,
  evolutionKey: string
) {
  const delayMin = config?.delay_minimo_segundos || 2;
  const delayMax = config?.delay_maximo_segundos || 5;
  const horaInicio = config?.hora_inicio_disparo || "08:00";
  const horaFim = config?.hora_fim_disparo || "20:00";
  const naoSabados = config?.nao_disparar_sabados || false;
  const naoDomingos = config?.nao_disparar_domingos || false;
  const hasFunnel = !!campaign.funil_id;
  const campanha_id = campaign.id;

  let sent = 0;
  let errors = 0;

  for (const contact of contacts) {
    try {
      // Check if campaign was paused
      const { data: currentCampaign } = await serviceClient
        .from("campanhas")
        .select("status")
        .eq("id", campanha_id)
        .single();
      if (currentCampaign?.status === "pausada") {
        console.log("Campaign paused, stopping processing");
        break;
      }

      // Check time restrictions
      const now = new Date();
      const day = now.getDay();
      if (naoSabados && day === 6) { console.log("Saturday, skipping"); break; }
      if (naoDomingos && day === 0) { console.log("Sunday, skipping"); break; }

      const currentTime = now.toTimeString().substring(0, 5);
      if (currentTime < horaInicio || currentTime > horaFim) {
        console.log(`Outside hours ${currentTime} not in ${horaInicio}-${horaFim}`);
        break;
      }

      // Apply delay
      const delay = randomDelay(delayMin, delayMax);
      console.log(`Waiting ${delay}s before sending to ${contact.telefone}`);
      await sleep(delay * 1000);

      if (hasFunnel) {
        // Start funnel execution for this contact
        const startFunnelUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/start-funnel-execution`;
        const funnelRes = await fetch(startFunnelUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            funil_id: campaign.funil_id,
            contato_telefone: contact.telefone,
            contato_nome: contact.nome || null,
            tenant_id: tenantId,
            session_id: campaign.session_id,
          }),
        });

        if (funnelRes.ok) {
          await serviceClient.from("campanhas_contatos").update({
            status: "enviado", enviado_em: new Date().toISOString(), tempo_espera_segundos: delay,
          }).eq("id", contact.id);
          await serviceClient.from("campanhas_historico_envios").insert({
            tenant_id: tenantId, campanha_id, contato_telefone: contact.telefone,
            status: "enviado", mensagem_texto: `[Funil: ${campaign.funil_id}]`,
            tempo_espera_segundos: delay, enviado_em: new Date().toISOString(),
          });
          sent++;
          console.log(`Funnel started for ${contact.telefone}`);
        } else {
          const errText = await funnelRes.text();
          console.error(`Funnel error for ${contact.telefone}: ${errText}`);
          await serviceClient.from("campanhas_contatos").update({
            status: "erro", erro_mensagem: errText.substring(0, 500),
          }).eq("id", contact.id);
          await serviceClient.from("campanhas_historico_envios").insert({
            tenant_id: tenantId, campanha_id, contato_telefone: contact.telefone,
            status: "erro", mensagem_texto: `[Funil: ${campaign.funil_id}]`,
            erro_mensagem: errText.substring(0, 500), tempo_espera_segundos: delay,
            enviado_em: new Date().toISOString(),
          });
          errors++;
        }
      } else {
        // Send template message directly
        const messageText = campaign.mensagem_template.replace(/{nome}/g, contact.nome || contact.telefone);
        const formattedPhone = contact.telefone.replace(/\D/g, "");

        const evolutionRes = await fetch(
          `${evolutionUrl}/message/sendText/${session.evolution_instance_id}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", apikey: evolutionKey },
            body: JSON.stringify({ number: formattedPhone, text: messageText }),
          }
        );

        if (evolutionRes.ok) {
          await serviceClient.from("campanhas_contatos").update({
            status: "enviado", enviado_em: new Date().toISOString(), tempo_espera_segundos: delay,
          }).eq("id", contact.id);
          await serviceClient.from("campanhas_historico_envios").insert({
            tenant_id: tenantId, campanha_id, contato_telefone: contact.telefone,
            status: "enviado", mensagem_texto: messageText,
            tempo_espera_segundos: delay, enviado_em: new Date().toISOString(),
          });
          sent++;
          console.log(`Message sent to ${contact.telefone}`);
        } else {
          const errData = await evolutionRes.text();
          console.error(`Send error for ${contact.telefone}: ${errData}`);
          await serviceClient.from("campanhas_contatos").update({
            status: "erro", erro_mensagem: errData.substring(0, 500),
          }).eq("id", contact.id);
          await serviceClient.from("campanhas_historico_envios").insert({
            tenant_id: tenantId, campanha_id, contato_telefone: contact.telefone,
            status: "erro", mensagem_texto: messageText,
            erro_mensagem: errData.substring(0, 500), tempo_espera_segundos: delay,
            enviado_em: new Date().toISOString(),
          });
          errors++;
        }
      }
    } catch (err) {
      console.error(`Error processing contact ${contact.telefone}:`, err.message);
      await serviceClient.from("campanhas_contatos").update({
        status: "erro", erro_mensagem: err.message,
      }).eq("id", contact.id);
      errors++;
    }
  }

  // Check if all done
  const { data: remaining } = await serviceClient
    .from("campanhas_contatos")
    .select("id")
    .eq("campanha_id", campanha_id)
    .eq("status", "pendente");

  if (!remaining || remaining.length === 0) {
    await serviceClient.from("campanhas").update({ status: "concluida" }).eq("id", campanha_id);
    console.log(`Campaign ${campanha_id} completed: sent=${sent} errors=${errors}`);
  } else {
    console.log(`Campaign ${campanha_id} partial: sent=${sent} errors=${errors} remaining=${remaining.length}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Fix: use getUser instead of non-existent getClaims
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      console.error("Auth error:", userError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;
    console.log(`Authenticated user: ${userId}`);

    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", userId).single();
    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const tenantId = profile.tenant_id;

    const { campanha_id } = await req.json();
    if (!campanha_id) {
      return new Response(JSON.stringify({ error: "campanha_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Starting campaign ${campanha_id} for tenant ${tenantId}`);

    // Service client for operations
    const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Get campaign
    const { data: campaign } = await serviceClient
      .from("campanhas").select("*").eq("id", campanha_id).eq("tenant_id", tenantId).single();
    if (!campaign) {
      return new Response(JSON.stringify({ error: "Campaign not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get config
    const { data: config } = await serviceClient
      .from("campanhas_configuracoes").select("*").eq("campanha_id", campanha_id).single();

    // Get session
    if (!campaign.session_id) {
      return new Response(JSON.stringify({ error: "No session configured" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: session } = await serviceClient
      .from("whatsapp_sessions").select("*").eq("id", campaign.session_id).single();
    if (!session || session.status !== "connected") {
      return new Response(JSON.stringify({ error: "Session not connected" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get settings
    const { data: settings } = await serviceClient
      .from("whatsapp_settings").select("evolution_api_url, evolution_api_key").eq("tenant_id", tenantId).single();
    const evolutionUrl = settings?.evolution_api_url || Deno.env.get("EVOLUTION_API_URL");
    const evolutionKey = settings?.evolution_api_key || Deno.env.get("EVOLUTION_API_KEY");

    // Mark campaign as active
    await serviceClient.from("campanhas").update({ status: "ativa" }).eq("id", campanha_id);

    // Get pending contacts
    let { data: contacts } = await serviceClient
      .from("campanhas_contatos").select("*").eq("campanha_id", campanha_id).eq("status", "pendente");
    if (!contacts || contacts.length === 0) {
      await serviceClient.from("campanhas").update({ status: "concluida" }).eq("id", campanha_id);
      return new Response(JSON.stringify({ ok: true, sent: 0, message: "No pending contacts" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Shuffle if configured
    if (config?.usar_sequencia_aleatoria) {
      contacts = contacts.sort(() => Math.random() - 0.5);
    }

    console.log(`Processing ${contacts.length} contacts in background`);

    // Process in background - return immediately to avoid timeout
    const backgroundPromise = processContacts(
      serviceClient, campaign, contacts, config, tenantId, session, evolutionUrl!, evolutionKey!
    );

    // Use EdgeRuntime.waitUntil if available, otherwise let it run
    // @ts-ignore - EdgeRuntime is a Deno Deploy global
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(backgroundPromise);
    } else {
      // Fallback: just fire and forget (the promise continues after response)
      backgroundPromise.catch((err) => console.error("Background processing error:", err));
    }

    // Return immediately
    return new Response(
      JSON.stringify({
        ok: true,
        message: "Campaign started, processing in background",
        total_contacts: contacts.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Campaign function error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
