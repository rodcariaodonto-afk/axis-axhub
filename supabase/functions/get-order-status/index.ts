import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const orderId = url.searchParams.get("id");
    if (!orderId) {
      return new Response(JSON.stringify({ error: "id query param required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: order, error } = await supabase
      .from("orders")
      .select("*, customers(name, email, phone), deals(name, status, payment_status, estimated_value)")
      .eq("id", orderId)
      .single();

    if (error) throw error;

    // Get receivables
    const { data: receivables } = await supabase
      .from("receivables")
      .select("id, description, amount, due_date, status, paid_at")
      .eq("order_id", orderId);

    // Get order items
    const { data: items } = await supabase
      .from("order_items")
      .select("*, products(name, sku)")
      .eq("order_id", orderId);

    return new Response(JSON.stringify({
      order,
      receivables: receivables || [],
      items: items || [],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
