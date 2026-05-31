// Edge Function: export-for-loyalty
// Chamada pelo AXIS Loyalty Radar para sincronizar dados do AXIS CRM+ERP.
// Autenticação via API Key gerada dentro do AXIS (Configurações → API Keys).
//
// Header: x-api-key: <sua_api_key_do_axis>
// Método: GET
// Parâmetros opcionais: ?since=2026-01-01T00:00:00Z&limit=500

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, x-api-key",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) return json({ error: "Missing x-api-key header" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Valida API key e obtém tenant_id
  const { data: keyRow, error: keyErr } = await supabase
    .from("api_keys")
    .select("tenant_id")
    .eq("api_key", apiKey)
    .single();

  if (keyErr || !keyRow) {
    return json({ error: "Invalid API key" }, 403);
  }

  const tenantId = keyRow.tenant_id;

  const url = new URL(req.url);
  const since = url.searchParams.get("since");
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "500"), 1000);
  const sinceFilter = since ? new Date(since).toISOString() : null;

  // Clientes
  let customersQ = supabase
    .from("customers")
    .select("id, name, email, phone, document, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (sinceFilter) customersQ = customersQ.gte("created_at", sinceFilter);
  const { data: customers } = await customersQ;

  // Recebíveis pagos (compras/receitas)
  let receivablesQ = supabase
    .from("receivables")
    .select("id, customer_id, amount, paid_at, description, payment_method, deal_id")
    .eq("tenant_id", tenantId)
    .eq("status", "paid")
    .not("paid_at", "is", null)
    .order("paid_at", { ascending: false })
    .limit(limit);
  if (sinceFilter) receivablesQ = receivablesQ.gte("paid_at", sinceFilter);
  const { data: receivables } = await receivablesQ;

  // Deals ganhos
  let dealsQ = supabase
    .from("deals")
    .select("id, name, account_id, contact_id, estimated_value, status, updated_at, created_at")
    .eq("tenant_id", tenantId)
    .eq("status", "won")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (sinceFilter) dealsQ = dealsQ.gte("updated_at", sinceFilter);
  const { data: deals } = await dealsQ;

  // Contatos (para mapear nomes em deals)
  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, name, email, phone")
    .eq("tenant_id", tenantId)
    .limit(limit);

  // Tickets de suporte (payables com status vencido ou pendente)
  const { data: payables } = await supabase
    .from("payables")
    .select("id, customer_id, amount, due_date, status, description")
    .eq("tenant_id", tenantId)
    .in("status", ["overdue", "pending"])
    .order("due_date", { ascending: false })
    .limit(limit);

  return json({
    ok: true,
    tenant_id: tenantId,
    exported_at: new Date().toISOString(),
    counts: {
      customers: customers?.length ?? 0,
      receivables: receivables?.length ?? 0,
      deals: deals?.length ?? 0,
      contacts: contacts?.length ?? 0,
      payables_pending: payables?.length ?? 0,
    },
    customers: customers ?? [],
    receivables: receivables ?? [],
    deals: deals ?? [],
    contacts: contacts ?? [],
    payables: payables ?? [],
  });
});
