import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { receivable_id, payment_status, bank_account_id, payment_date } = await req.json();
    if (!receivable_id || !payment_status) {
      return new Response(JSON.stringify({ error: "receivable_id and payment_status required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const updateData: Record<string, unknown> = { status: payment_status };
    if (payment_status === "paid") {
      updateData.paid_at = payment_date || new Date().toISOString();
      if (bank_account_id) updateData.bank_account_id = bank_account_id;
    }

    const { data, error } = await supabase.from("receivables").update(updateData).eq("id", receivable_id).select("*, customers(name)").single();
    if (error) throw error;

    // If paid and has bank_account_id, create bank transaction
    if (payment_status === "paid" && bank_account_id) {
      await supabase.from("bank_transactions").insert({
        tenant_id: data.tenant_id,
        account_id: bank_account_id,
        type: "credit",
        description: `Webhook: ${data.description}`,
        amount: Number(data.amount),
        transaction_date: payment_date || new Date().toISOString().split("T")[0],
        receivable_id: data.id,
      });

      const { data: account } = await supabase.from("bank_accounts").select("balance").eq("id", bank_account_id).single();
      if (account) {
        await supabase.from("bank_accounts").update({ balance: Number(account.balance) + Number(data.amount) }).eq("id", bank_account_id);
      }
    }

    return new Response(JSON.stringify({ success: true, receivable: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
