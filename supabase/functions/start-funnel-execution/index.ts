import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { funil_id, contato_telefone, contato_nome, tenant_id } = await req.json();
    if (!funil_id || !contato_telefone || !tenant_id) {
      return new Response(JSON.stringify({ error: "funil_id, contato_telefone, tenant_id required" }), { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Fetch funnel and its blocks/connections
    const { data: funil } = await supabase.from("funis").select("*").eq("id", funil_id).eq("tenant_id", tenant_id).single();
    if (!funil) return new Response(JSON.stringify({ error: "Funnel not found" }), { status: 404, headers: corsHeaders });

    const { data: blocos } = await supabase.from("funis_blocos").select("*").eq("funil_id", funil_id).order("posicao_y", { ascending: true });
    const { data: conexoes } = await supabase.from("funis_conexoes").select("*").eq("funil_id", funil_id);

    if (!blocos?.length) return new Response(JSON.stringify({ error: "No blocks in funnel" }), { status: 400, headers: corsHeaders });

    // Find start block (trigger types)
    const triggerTypes = ["webhook", "inicio_campanha", "tag_adicionada"];
    const startBlock = blocos.find(b => triggerTypes.includes(b.tipo)) || blocos[0];

    // Create execution record
    const { data: execucao, error: execError } = await supabase.from("funis_execucoes").insert({
      tenant_id,
      funil_id,
      contato_telefone,
      contato_nome: contato_nome || null,
      bloco_atual_id: startBlock.id,
      status: "em_andamento",
    }).select().single();

    if (execError) return new Response(JSON.stringify({ error: execError.message }), { status: 500, headers: corsHeaders });

    // Log start
    await supabase.from("funis_logs").insert({
      tenant_id, execucao_id: execucao.id, bloco_id: startBlock.id,
      bloco_tipo: startBlock.tipo, status: "executado",
      detalhes: { message: "Funnel execution started" },
    });

    // Process first block by calling process-funnel-block
    const processUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/process-funnel-block`;
    await fetch(processUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
      body: JSON.stringify({ execucao_id: execucao.id, bloco_id: startBlock.id, tenant_id }),
    });

    return new Response(JSON.stringify({ ok: true, execucao_id: execucao.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("start-funnel-execution error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
