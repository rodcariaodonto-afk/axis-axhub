import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import QRCode from "https://esm.sh/qrcode@1.5.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── CRC16-CCITT (polynomial 0x1021, init 0xFFFF) ──────────────────────────────
function crc16ccitt(str: string): number {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
    }
  }
  return crc & 0xFFFF;
}

// ── EMV TLV builder ────────────────────────────────────────────────────────────
function emv(id: string, value: string): string {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

// ── PIX EMV payload (BACEN spec) ───────────────────────────────────────────────
function buildPixPayload(
  pixKey: string,
  merchantName: string,
  merchantCity: string,
  amount: number,
  txId: string,
): string {
  const txIdClean = txId.replace(/[^a-zA-Z0-9]/g, "").substring(0, 25) || "***";

  const merchantAccInfo =
    emv("00", "br.gov.bcb.pix") +
    emv("01", pixKey);

  const additionalData = emv("05", txIdClean);

  const amountStr = amount.toFixed(2);

  // Sanitize name/city: uppercase, max length, ASCII only
  const name = merchantName
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toUpperCase().substring(0, 25);
  const city = merchantCity
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toUpperCase().substring(0, 15);

  let payload = "";
  payload += emv("00", "01");               // Payload Format Indicator
  payload += emv("01", "11");               // Point of Initiation (11=static)
  payload += emv("26", merchantAccInfo);    // Merchant Account Info
  payload += emv("52", "0000");             // Merchant Category Code
  payload += emv("53", "986");              // Currency BRL
  payload += emv("54", amountStr);          // Amount
  payload += emv("58", "BR");              // Country Code
  payload += emv("59", name);              // Merchant Name
  payload += emv("60", city);             // Merchant City
  payload += emv("62", additionalData);   // Additional Data
  payload += "6304";                       // CRC placeholder

  const crc = crc16ccitt(payload);
  return payload + crc.toString(16).toUpperCase().padStart(4, "0");
}

// ── Main handler ───────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase    = createClient(supabaseUrl, serviceKey);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Não autorizado" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json() as { pj_repasse_history_id?: string };
    if (!body.pj_repasse_history_id) {
      return new Response(JSON.stringify({ error: "pj_repasse_history_id obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Fetch repasse
    const { data: repasse, error: repErr } = await supabase
      .from("pj_repasse_history" as any)
      .select("id, tenant_id, pj_id, valor")
      .eq("id", body.pj_repasse_history_id)
      .single();

    if (repErr || !repasse) {
      return new Response(JSON.stringify({ error: "Repasse não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { pj_id, tenant_id, valor } = repasse as any;

    // 2. Fetch PJ bank account with pix_key
    const { data: bankAccounts } = await supabase
      .from("bank_accounts")
      .select("pix_key, pix_key_type, name, agency")
      .eq("pj_id", pj_id)
      .eq("tenant_id", tenant_id)
      .not("pix_key", "is", null)
      .order("created_at", { ascending: false })
      .limit(1);

    const bankAccount = (bankAccounts as any[])?.[0];

    if (!bankAccount?.pix_key) {
      return new Response(
        JSON.stringify({ error: "PJ não possui chave PIX cadastrada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3. Fetch PJ name for merchant name
    const { data: pjData } = await supabase
      .from("crm_accounts")
      .select("name, city")
      .eq("id", pj_id)
      .single();

    const merchantName = (pjData as any)?.name ?? "PRESTADOR PJ";
    const merchantCity = (pjData as any)?.city ?? "SAO PAULO";

    // 4. Build PIX EMV payload
    const txId = body.pj_repasse_history_id.replace(/-/g, "").substring(0, 25);
    const payload = buildPixPayload(
      bankAccount.pix_key,
      merchantName,
      merchantCity,
      Number(valor),
      txId,
    );

    // 5. Generate QR Code as SVG → base64 data URL (canvas-free, works in Deno)
    const svgString = await (QRCode as any).toString(payload, { type: "svg", width: 300, margin: 2 });
    const svgBase64 = btoa(unescape(encodeURIComponent(svgString)));
    const qrcodeDataUrl = `data:image/svg+xml;base64,${svgBase64}`;

    // 6. Save payload and QR code URL in pj_repasse_history
    await supabase
      .from("pj_repasse_history" as any)
      .update({
        pix_payload: payload,
        pix_qrcode_url: qrcodeDataUrl,
      })
      .eq("id", body.pj_repasse_history_id);

    return new Response(
      JSON.stringify({ payload, qrcode_base64: qrcodeDataUrl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("[generate-pix-payload]", err);
    return new Response(JSON.stringify({ error: err.message ?? "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
