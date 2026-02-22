import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { tenant_id, phone, display_name, message, message_type, direction, whatsapp_message_id } = await req.json();
    if (!tenant_id || !phone) {
      return new Response(JSON.stringify({ error: "tenant_id, phone required" }), { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const jid = `${phone.replace(/\D/g, "")}@s.whatsapp.net`;

    // Find or create CRM contact by whatsapp_jid or phone
    let contato_id: string | null = null;

    const { data: existingByJid } = await supabase.from("contacts")
      .select("id").eq("tenant_id", tenant_id).eq("whatsapp_jid", jid).limit(1).maybeSingle();

    if (existingByJid) {
      contato_id = existingByJid.id;
    } else {
      // Try matching by phone
      const cleanPhone = phone.replace(/\D/g, "");
      const { data: existingByPhone } = await supabase.from("contacts")
        .select("id").eq("tenant_id", tenant_id).ilike("phone", `%${cleanPhone.slice(-8)}%`).limit(1).maybeSingle();

      if (existingByPhone) {
        contato_id = existingByPhone.id;
        // Update whatsapp_jid
        await supabase.from("contacts").update({ whatsapp_jid: jid }).eq("id", contato_id);
      } else {
        // Create new CRM contact
        const { data: newContact } = await supabase.from("contacts").insert({
          tenant_id,
          first_name: display_name || phone,
          phone: cleanPhone,
          whatsapp_jid: jid,
        }).select("id").single();

        if (newContact) contato_id = newContact.id;
      }
    }

    // Save to mensagens_historico
    if (message) {
      await supabase.from("mensagens_historico").insert({
        tenant_id,
        contato_id,
        remetente: direction === "inbound" ? phone : "system",
        destinatario: direction === "inbound" ? "system" : phone,
        mensagem: message,
        message_type: message_type || "text",
        whatsapp_message_id: whatsapp_message_id || null,
      });
    }

    return new Response(JSON.stringify({ ok: true, contato_id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("sync-whatsapp-contact-to-crm error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
