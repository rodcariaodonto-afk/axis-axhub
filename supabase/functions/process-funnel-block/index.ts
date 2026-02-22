import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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
      case "enviar_mensagem": {
        // Send WhatsApp message
        const message = config.mensagem || config.message || "";
        const sessionId = config.session_id;
        if (sessionId && message) {
          const { data: session } = await supabase.from("whatsapp_sessions").select("evolution_instance_id, tenant_id, phone_number").eq("id", sessionId).single();
          if (session) {
            const { data: settings } = await supabase.from("whatsapp_settings").select("evolution_api_url, evolution_api_key").eq("tenant_id", tenant_id).single();
            const evolutionUrl = settings?.evolution_api_url || Deno.env.get("EVOLUTION_API_URL");
            const evolutionKey = settings?.evolution_api_key || Deno.env.get("EVOLUTION_API_KEY");
            const phone = execucao.contato_telefone.replace(/\D/g, "");
            const parsedMessage = message.replace("{{nome}}", execucao.contato_nome || "").replace("{{telefone}}", execucao.contato_telefone);

            const res = await fetch(`${evolutionUrl}/message/sendText/${session.evolution_instance_id}`, {
              method: "POST",
              headers: { "Content-Type": "application/json", apikey: evolutionKey! },
              body: JSON.stringify({ number: phone, text: parsedMessage }),
            });
            detalhes = { sent: res.ok, phone, message_preview: parsedMessage.substring(0, 100) };
          }
        }
        break;
      }
      case "enviar_midia": {
        detalhes = { message: "Media sending placeholder" };
        break;
      }
      case "delay": {
        const seconds = parseInt(config.segundos || config.seconds || "5");
        // For delays, we schedule the next block processing
        detalhes = { delay_seconds: seconds };
        await supabase.from("funis_logs").insert({ tenant_id, execucao_id, bloco_id, bloco_tipo: bloco.tipo, status: "executado", detalhes });

        // Wait then continue
        await new Promise(resolve => setTimeout(resolve, Math.min(seconds * 1000, 30000)));

        // Find and process next block
        await advanceToNext(supabase, execucao_id, bloco_id, tenant_id, execucao.funil_id);
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }
      case "condicao": {
        // Evaluate condition - simple field check
        const field = config.campo || config.field || "";
        const operator = config.operador || config.operator || "equals";
        const value = config.valor || config.value || "";

        // Get variables for this execution
        const { data: vars } = await supabase.from("funis_variaveis").select("*").eq("execucao_id", execucao_id).eq("chave", field).single();
        const actualValue = vars?.valor || "";
        let conditionMet = false;

        if (operator === "equals" || operator === "igual") conditionMet = actualValue === value;
        else if (operator === "contains" || operator === "contem") conditionMet = actualValue.includes(value);
        else if (operator === "not_empty" || operator === "nao_vazio") conditionMet = actualValue.length > 0;

        detalhes = { field, operator, expected: value, actual: actualValue, result: conditionMet };

        // Route based on condition: use source_handle "sim"/"nao"
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
        // Pause execution, waiting for external trigger
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
      case "fim_fluxo": {
        await supabase.from("funis_logs").insert({ tenant_id, execucao_id, bloco_id, bloco_tipo: bloco.tipo, status: "executado", detalhes: { message: "Flow ended" } });
        await supabase.from("funis_execucoes").update({ status: "concluido", finished_at: new Date().toISOString(), bloco_atual_id: bloco_id }).eq("id", execucao_id);
        return new Response(JSON.stringify({ ok: true, finished: true }), { headers: corsHeaders });
      }
      default: {
        detalhes = { message: `Block type ${bloco.tipo} processed` };
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
