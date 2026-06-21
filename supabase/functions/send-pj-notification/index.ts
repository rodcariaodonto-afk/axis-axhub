import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationPayload {
  tenant_id: string;
  pj_id: string;
  type: string;
  title: string;
  message: string;
  related_id?: string;
  related_type?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body = await req.json() as Partial<NotificationPayload>;

    // Validate required fields
    const required: (keyof NotificationPayload)[] = ["tenant_id", "pj_id", "type", "title", "message"];
    for (const field of required) {
      if (!body[field]) {
        return new Response(JSON.stringify({ error: `Campo obrigatório ausente: ${field}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { data, error } = await supabase
      .from("pj_notifications")
      .insert({
        tenant_id: body.tenant_id,
        pj_id: body.pj_id,
        type: body.type,
        title: body.title,
        message: body.message,
        related_id: body.related_id ?? null,
        related_type: body.related_type ?? null,
        is_read: false,
      })
      .select("id, created_at")
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, notification: data }), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[send-pj-notification]", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
