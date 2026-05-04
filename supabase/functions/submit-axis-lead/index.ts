import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TAMANHOS = ["1-10 usuarios", "11-50 usuarios", "51-200 usuarios", "200+ usuarios"];
const OBJETIVOS = [
  "organizar-pipeline",
  "melhorar-followup",
  "automatizar-processos",
  "criar-governanca",
  "integrar-canais",
  "acompanhar-indicadores",
  "falar-com-suporte",
];

const Schema = z.object({
  nome: z.string().trim().min(3).max(120),
  email: z.string().trim().email().max(180),
  whatsapp: z.string().trim().min(8).max(25),
  empresa: z.string().trim().min(1).max(160),
  cargo: z.string().trim().max(120).optional().nullable(),
  tamanho_operacao: z.enum(TAMANHOS as [string, ...string[]]),
  objetivo_principal: z.enum(OBJETIVOS as [string, ...string[]]),
  mensagem: z.string().trim().max(2000).optional().nullable(),
  consentimento_lgpd: z.literal(true),
  website: z.string().optional(), // honeypot
});

Deno.serve(async (req) => {
  const reqId = crypto.randomUUID();
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      console.log(`[${reqId}] validation_failed`, parsed.error.flatten().fieldErrors);
      return new Response(JSON.stringify({ error: "Dados inválidos." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Honeypot — silencioso
    if (parsed.data.website && parsed.data.website.trim().length > 0) {
      console.log(`[${reqId}] honeypot_triggered`);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const ua = req.headers.get("user-agent")?.slice(0, 500) ?? null;

    const { error } = await supabase.from("axis_landing_leads").insert({
      nome: parsed.data.nome,
      email: parsed.data.email.toLowerCase(),
      whatsapp: parsed.data.whatsapp,
      empresa: parsed.data.empresa,
      cargo: parsed.data.cargo || null,
      tamanho_operacao: parsed.data.tamanho_operacao,
      objetivo_principal: parsed.data.objetivo_principal,
      mensagem: parsed.data.mensagem || null,
      consentimento_lgpd: true,
      origem: "landing-axis",
      user_agent: ua,
      status: "novo",
    });

    if (error) {
      console.error(`[${reqId}] insert_error`, error.message);
      return new Response(JSON.stringify({ error: "Não foi possível registrar agora." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(`[${reqId}] unexpected`, (err as Error).message);
    return new Response(JSON.stringify({ error: "Erro inesperado." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
