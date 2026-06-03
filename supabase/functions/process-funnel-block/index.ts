import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (req.headers.get("Authorization") !== `Bearer ${serviceRoleKey}`) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }



  try {
    const { execucao_id, bloco_id, tenant_id } = await req.json();
    if (!execucao_id || !bloco_id || !tenant_id) {
      return new Response(JSON.stringify({ error: "execucao_id, bloco_id, tenant_id required" }), { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: execucao } = await supabase.from("funis_execucoes").select("*").eq("id", execucao_id).single();
    if (!execucao || execucao.status !== "em_andamento") {
      return new Response(JSON.stringify({ ok: true, skipped: "execution not active" }), { headers: corsHeaders });
    }

    const { data: bloco } = await supabase.from("funis_blocos").select("*").eq("id", bloco_id).single();
    if (!bloco) return new Response(JSON.stringify({ error: "Block not found" }), { status: 404, headers: corsHeaders });

    const config = bloco.config || {};
    let blockStatus = "executado";
    let detalhes: Record<string, unknown> = {};

    // Process block based on type
    switch (bloco.tipo) {
      case "enviar_texto":
      case "enviar_mensagem": {
        // Send WhatsApp message
        const message = config.mensagem || config.message || "";
        // session_id: try block config first, then execution-level, then fallback to first connected session
        let sessionId = config.session_id || execucao.session_id;
        
        // Fallback: if no session_id, pick first connected session for this tenant
        if (!sessionId) {
          console.log(`[enviar_texto] No session_id found, looking for first connected session for tenant ${tenant_id}`);
          const { data: fallbackSession } = await supabase
            .from("whatsapp_sessions")
            .select("id")
            .eq("tenant_id", tenant_id)
            .eq("status", "connected")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (fallbackSession) {
            sessionId = fallbackSession.id;
            console.log(`[enviar_texto] Using fallback session: ${sessionId}`);
          }
        }
        
        console.log(`[enviar_texto] sessionId=${sessionId}, message_len=${message.length}, phone=${execucao.contato_telefone}`);
        
        if (sessionId && message) {
          const { data: session } = await supabase.from("whatsapp_sessions").select("evolution_instance_id, tenant_id, phone_number").eq("id", sessionId).single();
          if (session) {
            const { data: settings } = await supabase.from("whatsapp_settings").select("evolution_api_url, evolution_api_key").eq("tenant_id", tenant_id).single();
            const evolutionUrl = settings?.evolution_api_url || Deno.env.get("EVOLUTION_API_URL");
            const evolutionKey = settings?.evolution_api_key || Deno.env.get("EVOLUTION_API_KEY");
            let phone = execucao.contato_telefone.replace(/\D/g, "");
            if (!phone.startsWith("55") && phone.length >= 10 && phone.length <= 11) {
              phone = "55" + phone;
            }
            const parsedMessage = message.replace("{{nome}}", execucao.contato_nome || "").replace("{{telefone}}", execucao.contato_telefone);

            console.log(`[enviar_texto] Sending to ${phone} via instance ${session.evolution_instance_id}`);
            
            const res = await fetch(`${evolutionUrl}/message/sendText/${session.evolution_instance_id}`, {
              method: "POST",
              headers: { "Content-Type": "application/json", apikey: evolutionKey! },
              body: JSON.stringify({ number: phone, text: parsedMessage }),
            });
            const resBody = await res.text();
            console.log(`[enviar_texto] Response: ok=${res.ok} status=${res.status} body=${resBody.substring(0, 200)}`);
            
            if (!res.ok) {
              blockStatus = "erro";
              detalhes = { error: "Message send failed", phone, status: res.status, response: resBody.substring(0, 300), message_preview: parsedMessage.substring(0, 100) };
              // Mark execution as error
              await supabase.from("funis_execucoes").update({ status: "erro", finished_at: new Date().toISOString() }).eq("id", execucao_id);
              await supabase.from("funis_logs").insert({ tenant_id, execucao_id, bloco_id, bloco_tipo: bloco.tipo, status: blockStatus, detalhes });
              return new Response(JSON.stringify({ ok: false, error: "Message send failed" }), { headers: corsHeaders });
            }
            
            detalhes = { sent: true, phone, message_preview: parsedMessage.substring(0, 100), status: res.status };
          } else {
            console.error(`[enviar_texto] Session ${sessionId} not found`);
            detalhes = { error: "Session not found", session_id: sessionId };
          }
        } else {
          console.warn(`[enviar_texto] Missing sessionId=${sessionId} or message_len=${message.length}`);
          detalhes = { error: "Missing session_id or message", session_id: sessionId, has_message: !!message };
        }
        break;
      }
      case "enviar_midia": {
        detalhes = { message: "Media sending placeholder" };
        break;
      }
      case "delay": {
        const seconds = parseInt(config.segundos || config.seconds || "5");
        detalhes = { delay_seconds: seconds };
        await supabase.from("funis_logs").insert({ tenant_id, execucao_id, bloco_id, bloco_tipo: bloco.tipo, status: "executado", detalhes });

        await new Promise(resolve => setTimeout(resolve, Math.min(seconds * 1000, 30000)));

        await advanceToNext(supabase, execucao_id, bloco_id, tenant_id, execucao.funil_id);
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }
      case "condicao": {
        const field = config.campo || config.field || "";
        const operator = config.operador || config.operator || "equals";
        const value = config.valor || config.value || "";

        const { data: vars } = await supabase.from("funis_variaveis").select("*").eq("execucao_id", execucao_id).eq("chave", field).single();
        const actualValue = vars?.valor || "";
        let conditionMet = false;

        if (operator === "equals" || operator === "igual") conditionMet = actualValue === value;
        else if (operator === "contains" || operator === "contem") conditionMet = actualValue.includes(value);
        else if (operator === "not_empty" || operator === "nao_vazio") conditionMet = actualValue.length > 0;

        detalhes = { field, operator, expected: value, actual: actualValue, result: conditionMet };

        await supabase.from("funis_logs").insert({ tenant_id, execucao_id, bloco_id, bloco_tipo: bloco.tipo, status: "executado", detalhes });

        const handle = conditionMet ? "sim" : "nao";
        const { data: nextConn } = await supabase.from("funis_conexoes")
          .select("target_bloco_id").eq("funil_id", execucao.funil_id).eq("source_bloco_id", bloco_id)
          .eq("source_handle", handle).limit(1).maybeSingle();

        if (nextConn) {
          await supabase.from("funis_execucoes").update({ bloco_atual_id: nextConn.target_bloco_id }).eq("id", execucao_id);
          const processUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/process-funnel-block`;
          await fetch(processUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
            body: JSON.stringify({ execucao_id, bloco_id: nextConn.target_bloco_id, tenant_id }),
          });
        } else {
          await supabase.from("funis_execucoes").update({ status: "concluido", finished_at: new Date().toISOString() }).eq("id", execucao_id);
        }
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }
      case "aguardar_resposta": {
        blockStatus = "aguardando";
        detalhes = { message: "Waiting for response" };
        await supabase.from("funis_logs").insert({ tenant_id, execucao_id, bloco_id, bloco_tipo: bloco.tipo, status: blockStatus, detalhes });
        return new Response(JSON.stringify({ ok: true, waiting: true }), { headers: corsHeaders });
      }
      case "atualizar_contato": {
        detalhes = { message: "Contact update placeholder", config };
        break;
      }
      case "adicionar_tag": {
        detalhes = { tag: config.tag || config.nome_tag, message: "Tag added" };
        break;
      }
      case "inicio":
      case "inicio_campanha":
      case "trigger": {
        detalhes = { message: `Trigger block ${bloco.tipo} processed` };
        break;
      }
      case "fim":
      case "fim_fluxo": {
        await supabase.from("funis_logs").insert({ tenant_id, execucao_id, bloco_id, bloco_tipo: bloco.tipo, status: "executado", detalhes: { message: "Flow ended" } });
        await supabase.from("funis_execucoes").update({ status: "concluido", finished_at: new Date().toISOString(), bloco_atual_id: bloco_id }).eq("id", execucao_id);
        return new Response(JSON.stringify({ ok: true, finished: true }), { headers: corsHeaders });
      }
      default: {
        console.warn(`[process-funnel-block] Unknown block type: ${bloco.tipo}`);
        detalhes = { message: `Block type ${bloco.tipo} not recognized` };
      }
    }

    // Log execution
    await supabase.from("funis_logs").insert({ tenant_id, execucao_id, bloco_id, bloco_tipo: bloco.tipo, status: blockStatus, detalhes });

    // Advance to next block
    await advanceToNext(supabase, execucao_id, bloco_id, tenant_id, execucao.funil_id);

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("process-funnel-block error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});

async function advanceToNext(supabase: any, execucaoId: string, currentBlocoId: string, tenantId: string, funilId: string) {
  const { data: nextConn } = await supabase.from("funis_conexoes")
    .select("target_bloco_id").eq("funil_id", funilId).eq("source_bloco_id", currentBlocoId)
    .limit(1).maybeSingle();

  if (nextConn) {
    await supabase.from("funis_execucoes").update({ bloco_atual_id: nextConn.target_bloco_id }).eq("id", execucaoId);
    const processUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/process-funnel-block`;
    await fetch(processUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
      body: JSON.stringify({ execucao_id: execucaoId, bloco_id: nextConn.target_bloco_id, tenant_id: tenantId }),
    });
  } else {
    await supabase.from("funis_execucoes").update({ status: "concluido", finished_at: new Date().toISOString() }).eq("id", execucaoId);
  }
}
