import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelay(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

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
    if (!profile) return new Response(JSON.stringify({ error: "Profile not found" }), { status: 404, headers: corsHeaders });
    const tenantId = profile.tenant_id;

    const { campanha_id } = await req.json();
    if (!campanha_id) return new Response(JSON.stringify({ error: "campanha_id required" }), { status: 400, headers: corsHeaders });

    // Service client for operations
    const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Get campaign
    const { data: campaign } = await serviceClient.from("campanhas").select("*").eq("id", campanha_id).eq("tenant_id", tenantId).single();
    if (!campaign) return new Response(JSON.stringify({ error: "Campaign not found" }), { status: 404, headers: corsHeaders });

    // Get config
    const { data: config } = await serviceClient.from("campanhas_configuracoes").select("*").eq("campanha_id", campanha_id).single();
    const delayMin = config?.delay_minimo_segundos || 2;
    const delayMax = config?.delay_maximo_segundos || 5;
    const horaInicio = config?.hora_inicio_disparo || "08:00";
    const horaFim = config?.hora_fim_disparo || "20:00";
    const naoSabados = config?.nao_disparar_sabados || false;
    const naoDomingos = config?.nao_disparar_domingos || false;

    // Get session
    if (!campaign.session_id) return new Response(JSON.stringify({ error: "No session configured" }), { status: 400, headers: corsHeaders });
    const { data: session } = await serviceClient.from("whatsapp_sessions").select("*").eq("id", campaign.session_id).single();
    if (!session || session.status !== "connected") return new Response(JSON.stringify({ error: "Session not connected" }), { status: 400, headers: corsHeaders });

    // Get settings
    const { data: settings } = await serviceClient.from("whatsapp_settings").select("evolution_api_url, evolution_api_key").eq("tenant_id", tenantId).single();
    const evolutionUrl = settings?.evolution_api_url || Deno.env.get("EVOLUTION_API_URL");
    const evolutionKey = settings?.evolution_api_key || Deno.env.get("EVOLUTION_API_KEY");

    // Mark campaign as active
    await serviceClient.from("campanhas").update({ status: "ativa" }).eq("id", campanha_id);

    // Get pending contacts
    let { data: contacts } = await serviceClient.from("campanhas_contatos").select("*").eq("campanha_id", campanha_id).eq("status", "pendente");
    if (!contacts || contacts.length === 0) {
      await serviceClient.from("campanhas").update({ status: "concluida" }).eq("id", campanha_id);
      return new Response(JSON.stringify({ ok: true, sent: 0, message: "No pending contacts" }), { headers: corsHeaders });
    }

    // Shuffle if configured
    if (config?.usar_sequencia_aleatoria) {
      contacts = contacts.sort(() => Math.random() - 0.5);
    }

    let sent = 0;
    let errors = 0;

    for (const contact of contacts) {
      // Check if campaign was paused
      const { data: currentCampaign } = await serviceClient.from("campanhas").select("status").eq("id", campanha_id).single();
      if (currentCampaign?.status === "pausada") break;

      // Check time restrictions
      const now = new Date();
      const day = now.getDay();
      if (naoSabados && day === 6) break;
      if (naoDomingos && day === 0) break;

      const currentTime = now.toTimeString().substring(0, 5);
      if (currentTime < horaInicio || currentTime > horaFim) break;

      // Apply delay
      const delay = randomDelay(delayMin, delayMax);
      await sleep(delay * 1000);

      // Prepare message
      const messageText = campaign.mensagem_template.replace(/{nome}/g, contact.nome || contact.telefone);
      const formattedPhone = contact.telefone.replace(/\D/g, "");

      try {
        const evolutionRes = await fetch(
          `${evolutionUrl}/message/sendText/${session.evolution_instance_id}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", apikey: evolutionKey! },
            body: JSON.stringify({ number: formattedPhone, text: messageText }),
          }
        );

        if (evolutionRes.ok) {
          await serviceClient.from("campanhas_contatos").update({ status: "enviado", enviado_em: new Date().toISOString(), tempo_espera_segundos: delay }).eq("id", contact.id);
          await serviceClient.from("campanhas_historico_envios").insert({
            tenant_id: tenantId, campanha_id, contato_telefone: contact.telefone, status: "enviado",
            mensagem_texto: messageText, tempo_espera_segundos: delay, enviado_em: new Date().toISOString(),
          });
          sent++;
        } else {
          const errData = await evolutionRes.text();
          await serviceClient.from("campanhas_contatos").update({ status: "erro", erro_mensagem: errData.substring(0, 500) }).eq("id", contact.id);
          await serviceClient.from("campanhas_historico_envios").insert({
            tenant_id: tenantId, campanha_id, contato_telefone: contact.telefone, status: "erro",
            mensagem_texto: messageText, erro_mensagem: errData.substring(0, 500), tempo_espera_segundos: delay, enviado_em: new Date().toISOString(),
          });
          errors++;
        }
      } catch (err) {
        await serviceClient.from("campanhas_contatos").update({ status: "erro", erro_mensagem: err.message }).eq("id", contact.id);
        await serviceClient.from("campanhas_historico_envios").insert({
          tenant_id: tenantId, campanha_id, contato_telefone: contact.telefone, status: "erro",
          mensagem_texto: messageText, erro_mensagem: err.message, tempo_espera_segundos: delay, enviado_em: new Date().toISOString(),
        });
        errors++;
      }
    }

    // Check if all done
    const { data: remaining } = await serviceClient.from("campanhas_contatos").select("id").eq("campanha_id", campanha_id).eq("status", "pendente");
    if (!remaining || remaining.length === 0) {
      await serviceClient.from("campanhas").update({ status: "concluida" }).eq("id", campanha_id);
    }

    return new Response(JSON.stringify({ ok: true, sent, errors }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
