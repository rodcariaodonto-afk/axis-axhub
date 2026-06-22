import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Scope required for each method+path combination
const SCOPE_MAP: Array<{ method: string | null; pattern: RegExp; scope: string }> = [
  { method: "GET",  pattern: /^\/api\/v1\/pj/,         scope: "pj:read" },
  { method: "POST", pattern: /^\/api\/v1\/pj/,         scope: "pj:write" },
  { method: "GET",  pattern: /^\/api\/v1\/nf/,         scope: "nf:read" },
  { method: "POST", pattern: /^\/api\/v1\/nf/,         scope: "nf:write" },
  { method: "GET",  pattern: /^\/api\/v1\/contracts/,  scope: "contracts:read" },
  { method: "GET",  pattern: /^\/api\/v1\/documents/,  scope: "documents:read" },
];

function json(body: unknown, status = 200, extra?: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders, ...extra },
  });
}

function err(message: string, status: number) {
  return json({ error: message }, status);
}

function paginate<T>(rows: T[], page: number, perPage: number) {
  const start = (page - 1) * perPage;
  return {
    data: rows.slice(start, start + perPage),
    meta: { total: rows.length, page, per_page: perPage },
  };
}

// ── Route handlers ────────────────────────────────────────────────────────────

async function handlePJList(sb: ReturnType<typeof createClient>, tenantId: string, url: URL) {
  const page = Number(url.searchParams.get("page") ?? 1);
  const perPage = Math.min(Number(url.searchParams.get("per_page") ?? 20), 100);

  const { data, error } = await (sb as any)
    .from("pj_providers")
    .select("id,name,cnpj,email,phone,status,created_at")
    .eq("tenant_id", tenantId)
    .order("name");

  if (error) return err("Erro ao consultar prestadores", 500);
  return json(paginate(data ?? [], page, perPage));
}

async function handlePJDetail(sb: ReturnType<typeof createClient>, tenantId: string, pjId: string) {
  const { data, error } = await (sb as any)
    .from("pj_providers")
    .select("id,name,cnpj,email,phone,status,created_at")
    .eq("tenant_id", tenantId)
    .eq("id", pjId)
    .maybeSingle();

  if (error) return err("Erro ao consultar prestador", 500);
  if (!data) return err("Prestador não encontrado", 404);
  return json({ data });
}

async function handlePJContracts(sb: ReturnType<typeof createClient>, tenantId: string, pjId: string, url: URL) {
  const page = Number(url.searchParams.get("page") ?? 1);
  const perPage = Math.min(Number(url.searchParams.get("per_page") ?? 20), 100);

  const { data, error } = await (sb as any)
    .from("contracts")
    .select("id,title,status,start_date,end_date,created_at")
    .eq("tenant_id", tenantId)
    .eq("pj_provider_id", pjId)
    .order("created_at", { ascending: false });

  if (error) return err("Erro ao consultar contratos", 500);
  return json(paginate(data ?? [], page, perPage));
}

async function handlePJRepasses(sb: ReturnType<typeof createClient>, tenantId: string, pjId: string, url: URL) {
  const page = Number(url.searchParams.get("page") ?? 1);
  const perPage = Math.min(Number(url.searchParams.get("per_page") ?? 20), 100);

  const { data, error } = await (sb as any)
    .from("pj_repasse_history")
    .select("id,competencia,valor,status,pix_payload,transaction_id,paid_date,conciliation_status,created_at")
    .eq("tenant_id", tenantId)
    .eq("pj_id", pjId)
    .order("created_at", { ascending: false });

  if (error) return err("Erro ao consultar repasses", 500);
  return json(paginate(data ?? [], page, perPage));
}

async function handleNFList(sb: ReturnType<typeof createClient>, tenantId: string, url: URL) {
  const page = Number(url.searchParams.get("page") ?? 1);
  const perPage = Math.min(Number(url.searchParams.get("per_page") ?? 20), 100);
  const status = url.searchParams.get("status");
  const pjId   = url.searchParams.get("pj_id");

  let q = (sb as any)
    .from("nf_approvals")
    .select("id,pj_id,numero_nf,valor,status,chave_nfe,sefaz_status,nf_due_date,created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (status) q = q.eq("status", status);
  if (pjId)   q = q.eq("pj_id", pjId);

  const { data, error } = await q;
  if (error) return err("Erro ao consultar NFs", 500);
  return json(paginate(data ?? [], page, perPage));
}

async function handleNFDetail(sb: ReturnType<typeof createClient>, tenantId: string, nfId: string) {
  const { data, error } = await (sb as any)
    .from("nf_approvals")
    .select("id,pj_id,numero_nf,valor,status,chave_nfe,sefaz_status,sefaz_validation,nf_due_date,xml_url,created_at")
    .eq("tenant_id", tenantId)
    .eq("id", nfId)
    .maybeSingle();

  if (error) return err("Erro ao consultar NF", 500);
  if (!data) return err("Nota fiscal não encontrada", 404);
  return json({ data });
}

async function handleNFCreate(sb: ReturnType<typeof createClient>, tenantId: string, body: any) {
  const { pj_id, numero_nf, valor, chave_nfe, nf_due_date } = body ?? {};
  if (!pj_id || !numero_nf || valor == null)
    return err("Campos obrigatórios: pj_id, numero_nf, valor", 422);

  const { data, error } = await (sb as any).from("nf_approvals").insert({
    tenant_id: tenantId,
    pj_id,
    numero_nf: String(numero_nf),
    valor: Number(valor),
    status: "pendente",
    chave_nfe: chave_nfe ?? null,
    nf_due_date: nf_due_date ?? null,
  }).select("id,status,created_at").single();

  if (error) return err("Erro ao criar NF: " + error.message, 500);
  return json({ data }, 201);
}

async function handleDocuments(sb: ReturnType<typeof createClient>, tenantId: string, pjId: string, url: URL) {
  const page = Number(url.searchParams.get("page") ?? 1);
  const perPage = Math.min(Number(url.searchParams.get("per_page") ?? 20), 100);

  const { data, error } = await (sb as any)
    .from("pj_documents")
    .select("id,pj_id,document_type_id,file_name,file_url,validation_status,expires_at,created_at")
    .eq("tenant_id", tenantId)
    .eq("pj_id", pjId)
    .order("created_at", { ascending: false });

  if (error) return err("Erro ao consultar documentos", 500);
  return json(paginate(data ?? [], page, perPage));
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startMs = Date.now();
  const url = new URL(req.url);
  const fullPath = url.pathname;

  // Strip the function prefix: /api-gateway/api/v1/... → /api/v1/...
  const apiPath = fullPath.replace(/^\/api-gateway/, "");

  // ── Extract API key ──────────────────────────────────────────────────────
  const rawKey =
    req.headers.get("x-api-key") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    null;

  if (!rawKey) return err("X-API-Key header obrigatório", 401);

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  // ── Validate key ─────────────────────────────────────────────────────────
  const { data: keyRow, error: keyErr } = await (sb as any)
    .from("api_keys")
    .select("id,tenant_id,scopes,rate_limit,is_active,expires_at")
    .eq("api_key", rawKey)
    .maybeSingle();

  if (keyErr || !keyRow) return err("Chave de API inválida", 401);
  if (!keyRow.is_active) return err("Chave revogada", 403);
  if (keyRow.expires_at && new Date(keyRow.expires_at) < new Date())
    return err("Chave expirada", 403);

  // ── Rate limiting ────────────────────────────────────────────────────────
  const windowStart = new Date(Date.now() - 60_000).toISOString();
  const { count: reqCount } = await (sb as any)
    .from("api_request_logs")
    .select("id", { count: "exact", head: true })
    .eq("api_key_id", keyRow.id)
    .gte("created_at", windowStart);

  if ((reqCount ?? 0) >= keyRow.rate_limit)
    return err(`Rate limit excedido: ${keyRow.rate_limit} req/min`, 429);

  // ── Scope check ──────────────────────────────────────────────────────────
  const scopeRule = SCOPE_MAP.find(
    (r) => (r.method === null || r.method === req.method) && r.pattern.test(apiPath)
  );
  if (scopeRule && !(keyRow.scopes as string[]).includes(scopeRule.scope))
    return err(`Escopo insuficiente: requer ${scopeRule.scope}`, 403);

  // ── Route ────────────────────────────────────────────────────────────────
  const tenantId = keyRow.tenant_id as string;
  let response: Response;

  // Path parameter extraction helpers
  const pjMatch         = apiPath.match(/^\/api\/v1\/pj\/([^/]+)/);
  const nfMatch         = apiPath.match(/^\/api\/v1\/nf\/([^/]+)/);
  const documentsMatch  = apiPath.match(/^\/api\/v1\/documents\/([^/]+)/);

  try {
    if (apiPath === "/api/v1/pj" && req.method === "GET") {
      response = await handlePJList(sb, tenantId, url);
    } else if (pjMatch && apiPath.endsWith("/contracts") && req.method === "GET") {
      response = await handlePJContracts(sb, tenantId, pjMatch[1], url);
    } else if (pjMatch && apiPath.endsWith("/repasses") && req.method === "GET") {
      response = await handlePJRepasses(sb, tenantId, pjMatch[1], url);
    } else if (pjMatch && req.method === "GET") {
      response = await handlePJDetail(sb, tenantId, pjMatch[1]);
    } else if (apiPath === "/api/v1/nf" && req.method === "GET") {
      response = await handleNFList(sb, tenantId, url);
    } else if (apiPath === "/api/v1/nf" && req.method === "POST") {
      const body = await req.json().catch(() => null);
      response = await handleNFCreate(sb, tenantId, body);
    } else if (nfMatch && req.method === "GET") {
      response = await handleNFDetail(sb, tenantId, nfMatch[1]);
    } else if (documentsMatch && req.method === "GET") {
      response = await handleDocuments(sb, tenantId, documentsMatch[1], url);
    } else {
      response = err("Endpoint não encontrado", 404);
    }
  } catch (e) {
    console.error("api-gateway error:", e);
    response = err("Erro interno", 500);
  }

  // ── Log request ──────────────────────────────────────────────────────────
  const responseTimeMs = Date.now() - startMs;
  const statusCode = response.status;
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("cf-connecting-ip") ??
    null;

  await (sb as any).from("api_request_logs").insert({
    tenant_id: tenantId,
    api_key_id: keyRow.id,
    method: req.method,
    path: apiPath,
    status_code: statusCode,
    response_time_ms: responseTimeMs,
    ip_address: ip,
  }).then(() => {
    // Fire-and-forget: also update last_used_at on the key
    (sb as any).from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRow.id);
  });

  return response;
});
