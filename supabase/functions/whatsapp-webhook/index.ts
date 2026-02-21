import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-n8n-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Validate signature
  const signature = req.headers.get("x-n8n-signature");
  const expectedSignature = Deno.env.get("N8N_SIGNATURE");

  if (!expectedSignature || signature !== expectedSignature) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let body: { phone?: string; message?: string; tenant_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { phone, message, tenant_id } = body;

  if (!phone || !message || !tenant_id) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: phone, message, tenant_id" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (phone.length > 20 || message.length > 500) {
    return new Response(
      JSON.stringify({ error: "Input too long" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Extract search term - remove common prefixes
  const prefixes = [
    "quero ver o produto",
    "quero o produto",
    "me mostra o produto",
    "buscar produto",
    "produto",
    "buscar",
  ];
  let searchTerm = message.trim();
  for (const prefix of prefixes) {
    if (searchTerm.toLowerCase().startsWith(prefix)) {
      searchTerm = searchTerm.slice(prefix.length).trim();
      break;
    }
  }

  if (!searchTerm) {
    return new Response(
      JSON.stringify({ phone, found: false, message: "Nenhum termo de busca identificado" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Query products
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: products, error } = await supabase
    .from("products")
    .select("name, description, price, image_url")
    .eq("tenant_id", tenant_id)
    .eq("is_active", true)
    .ilike("name", `%${searchTerm}%`)
    .limit(5);

  if (error) {
    return new Response(
      JSON.stringify({ error: "Database error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!products || products.length === 0) {
    return new Response(
      JSON.stringify({ phone, found: false, message: `Nenhum produto encontrado para '${searchTerm}'` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (products.length === 1) {
    const p = products[0];
    return new Response(
      JSON.stringify({
        phone,
        found: true,
        product: {
          name: p.name,
          description: p.description,
          price: p.price,
          image_url: p.image_url,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({
      phone,
      found: true,
      products: products.map((p) => ({
        name: p.name,
        description: p.description,
        price: p.price,
        image_url: p.image_url,
      })),
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
