import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "https://esm.sh/zod@3.23.8";

const BodySchema = z.object({
  reason: z.string().min(3).max(2000),
  scope: z.enum(["account", "subject"]).default("account"),
  subject_email: z.string().email().optional(),
  subject_type: z.string().optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const reqId = crypto.randomUUID();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userClient = createClient(supabaseUrl, anon, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(supabaseUrl, service);
    const { data: profile } = await admin.from("profiles").select("tenant_id").eq("id", user.id).single();
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = roles?.some((r: any) => r.role === "admin");
    if (!isAdmin) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return new Response(JSON.stringify({ error: parsed.error.flatten() }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const token = crypto.randomUUID();
    const scheduledFor = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await admin.from("data_deletion_requests").insert({
      tenant_id: profile!.tenant_id,
      requested_by: user.id,
      status: "pending",
      reason: parsed.data.reason,
      scheduled_for: scheduledFor,
      confirmation_token: token,
      audit_snapshot: { scope: parsed.data.scope, subject_email: parsed.data.subject_email, requested_at: new Date().toISOString() },
    }).select().single();
    if (error) throw error;

    await admin.from("audit_logs").insert({
      tenant_id: profile!.tenant_id,
      actor_user_id: user.id,
      action: "deletion_request_created",
      entity: "data_deletion_requests",
      entity_id: data.id,
      event_type: "governance",
      severity: "critical",
      metadata: { reqId, scope: parsed.data.scope },
    });

    return new Response(JSON.stringify({ ok: true, request: data, confirmation_token: token }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error(reqId, e);
    return new Response(JSON.stringify({ error: e.message, reqId }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
