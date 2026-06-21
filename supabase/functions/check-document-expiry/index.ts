import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Alert thresholds (days before expiry)
const THRESHOLDS = [30, 15, 7] as const;

function getThresholdType(days: number): string | null {
  if (days <= 7)  return "doc_vencendo_7d";
  if (days <= 15) return "doc_vencendo_15d";
  if (days <= 30) return "doc_vencendo_30d";
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const maxThreshold = Math.max(...THRESHOLDS);
    const limitDate = new Date(today);
    limitDate.setDate(limitDate.getDate() + maxThreshold);

    // Fetch all docs expiring in the next 30 days (not yet expired)
    const { data: docs, error: docsError } = await supabase
      .from("pj_documents" as any)
      .select(`
        id, tenant_id, pj_id, expiry_date,
        crm_accounts(name),
        pj_document_types(name)
      `)
      .not("expiry_date", "is", null)
      .gte("expiry_date", today.toISOString().slice(0, 10))
      .lte("expiry_date", limitDate.toISOString().slice(0, 10));

    if (docsError) {
      console.error("[check-document-expiry] fetch docs error:", docsError);
      return new Response(JSON.stringify({ error: docsError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!docs || (docs as any[]).length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Window for idempotency check (today's notifications)
    const tomorrowStart = new Date(today);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const todayIso = today.toISOString();
    const tomorrowIso = tomorrowStart.toISOString();

    let notified = 0;
    let skipped = 0;

    for (const doc of docs as any[]) {
      const expiryDate = new Date(doc.expiry_date);
      expiryDate.setHours(0, 0, 0, 0);
      const daysUntilExpiry = Math.ceil(
        (expiryDate.getTime() - today.getTime()) / 86_400_000
      );

      const notifType = getThresholdType(daysUntilExpiry);
      if (!notifType) continue;

      // Idempotency: skip if notification of this type for this doc was already sent today
      const { data: existing } = await supabase
        .from("pj_notifications" as any)
        .select("id")
        .eq("related_id", doc.id)
        .eq("related_type", "pj_document")
        .eq("type", notifType)
        .gte("created_at", todayIso)
        .lt("created_at", tomorrowIso)
        .limit(1);

      if (existing && (existing as any[]).length > 0) {
        skipped++;
        continue;
      }

      const pjName = (doc.crm_accounts as any)?.name ?? "PJ";
      const docTypeName = (doc.pj_document_types as any)?.name ?? "Documento";
      const expiryFormatted = doc.expiry_date as string;

      // Notify the PJ
      await supabase.from("pj_notifications" as any).insert({
        tenant_id: doc.tenant_id,
        pj_id: doc.pj_id,
        type: notifType,
        title: "Documento próximo do vencimento",
        message: `${docTypeName} vence em ${daysUntilExpiry} dia${daysUntilExpiry !== 1 ? "s" : ""} (${expiryFormatted}). Envie uma nova versão antes do prazo.`,
        related_id: doc.id,
        related_type: "pj_document",
        is_read: false,
      });

      // Notify tenant admins via the notifications table
      try {
        const { data: admins } = await supabase
          .from("profiles" as any)
          .select("id")
          .eq("tenant_id", doc.tenant_id);

        if (admins && (admins as any[]).length > 0) {
          const adminIds = (admins as any[]).map((a) => a.id);
          const { data: adminRoles } = await supabase
            .from("user_roles" as any)
            .select("user_id")
            .eq("role", "admin")
            .in("user_id", adminIds);

          if (adminRoles && (adminRoles as any[]).length > 0) {
            const adminNotifications = (adminRoles as any[]).map((ar) => ({
              tenant_id: doc.tenant_id,
              notification_type_id: notifType,
              recipient_id: ar.user_id,
              title: "Documento PJ próximo do vencimento",
              message: `${pjName} — ${docTypeName} vence em ${daysUntilExpiry} dia${daysUntilExpiry !== 1 ? "s" : ""} (${expiryFormatted}).`,
              related_entity_type: "pj_document",
              related_entity_id: doc.id,
              action_url: "/pj-documents",
              priority: daysUntilExpiry <= 7 ? "high" : "normal",
              is_read: false,
            }));
            await supabase.from("notifications" as any).insert(adminNotifications);
          }
        }
      } catch (adminErr) {
        console.error("[check-document-expiry] admin notification error:", adminErr);
      }

      notified++;
    }

    console.log(`[check-document-expiry] notified=${notified} skipped=${skipped}`);

    return new Response(
      JSON.stringify({ ok: true, processed: (docs as any[]).length, notified, skipped }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[check-document-expiry]", err);
    return new Response(JSON.stringify({ error: err.message ?? "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
