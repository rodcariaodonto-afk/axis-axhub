// Clicksign API v1 adapter (production)
// Docs: https://developers.clicksign.com
export const CLICKSIGN_BASE_URL = "https://app.clicksign.com/api/v1";

export interface ClicksignSigner {
  email: string;
  name: string;
  signing_order?: number;
}

export interface CreateEnvelopeInput {
  tenant_id: string;
  contract_id: string;
  file_url: string;       // URL pública/assinada do PDF
  file_name: string;      // ex: "contrato-123.pdf"
  signers: ClicksignSigner[];
  deadline_at?: string;   // ISO date string
  message?: string;
}

export interface CreateEnvelopeResult {
  document_key: string;
  signers: Array<{ email: string; name: string; signer_key: string; sign_url?: string }>;
}

export class ClicksignClient {
  constructor(private token: string, private baseUrl = CLICKSIGN_BASE_URL) {}

  private url(path: string) {
    const sep = path.includes("?") ? "&" : "?";
    return `${this.baseUrl}${path}${sep}access_token=${encodeURIComponent(this.token)}`;
  }

  async testToken(): Promise<boolean> {
    // Calls GET /accounts to validate the token
    const res = await fetch(this.url("/accounts"), {
      headers: { Accept: "application/json" },
    });
    return res.ok;
  }

  async createEnvelope(input: CreateEnvelopeInput): Promise<CreateEnvelopeResult> {
    // 1) Upload document via content_url
    const docRes = await fetch(this.url("/documents"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        document: {
          path: `/AXHUB/${input.tenant_id}/${input.file_name}`,
          content_url: input.file_url,
          deadline_at: input.deadline_at,
          auto_close: true,
          locale: "pt-BR",
          sequence_enabled: input.signers.some((s) => s.signing_order != null),
          remind_interval: "3",
        },
      }),
    });
    if (!docRes.ok) {
      const txt = await docRes.text();
      throw new Error(`Clicksign upload failed (${docRes.status}): ${txt}`);
    }
    const docJson = await docRes.json();
    const documentKey: string = docJson?.document?.key;
    if (!documentKey) throw new Error("Clicksign document.key ausente na resposta");

    const resultSigners: CreateEnvelopeResult["signers"] = [];

    // 2) Create signers and bind to document
    for (const s of input.signers) {
      const sRes = await fetch(this.url("/signers"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          signer: {
            email: s.email,
            name: s.name,
            auths: ["email"],
            delivery: "email",
            communicate_by: "email",
          },
        }),
      });
      if (!sRes.ok) {
        const txt = await sRes.text();
        throw new Error(`Clicksign signer failed (${sRes.status}): ${txt}`);
      }
      const sJson = await sRes.json();
      const signerKey: string = sJson?.signer?.key;

      // Bind signer → document (list)
      const listRes = await fetch(this.url("/lists"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          list: {
            document_key: documentKey,
            signer_key: signerKey,
            sign_as: "sign",
            group: s.signing_order ?? 1,
            message: input.message ?? "Por favor, assine o contrato.",
          },
        }),
      });
      if (!listRes.ok) {
        const txt = await listRes.text();
        throw new Error(`Clicksign list bind failed (${listRes.status}): ${txt}`);
      }
      const listJson = await listRes.json();
      resultSigners.push({
        email: s.email,
        name: s.name,
        signer_key: signerKey,
        sign_url: listJson?.list?.url,
      });
    }

    return { document_key: documentKey, signers: resultSigners };
  }

  async cancelDocument(documentKey: string) {
    const res = await fetch(this.url(`/documents/${documentKey}/cancel`), { method: "POST" });
    if (!res.ok) throw new Error(`Clicksign cancel failed: ${await res.text()}`);
  }

  async downloadSignedDocument(documentKey: string): Promise<{ url: string } | null> {
    const res = await fetch(this.url(`/documents/${documentKey}`), {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const downloads = json?.document?.downloads;
    const url = downloads?.signed_file_url || downloads?.original_file_url;
    return url ? { url } : null;
  }
}

export interface ClicksignWebhookEvent {
  event_name: string;
  document_key?: string;
  signed_signer_email?: string;
  status?: "sent" | "partially_signed" | "signed" | "refused" | "cancelled" | "expired";
}

export function parseClicksignWebhook(payload: any): ClicksignWebhookEvent {
  const eventName: string = payload?.event?.name ?? "";
  const docKey: string | undefined = payload?.document?.key;
  const map: Record<string, ClicksignWebhookEvent["status"]> = {
    add_signer: "sent",
    upload: "sent",
    sign: "partially_signed",
    auto_close: "signed",
    close: "signed",
    refusal: "refused",
    cancel: "cancelled",
    deadline: "expired",
  };
  const signedSigner = (payload?.document?.signers ?? []).find(
    (x: any) => x?.signed_at,
  );
  return {
    event_name: eventName,
    document_key: docKey,
    status: map[eventName],
    signed_signer_email: signedSigner?.email,
  };
}

/**
 * Lê o Access Token + HMAC Secret da Clicksign salvos na tabela `integrations`
 * para o tenant em questão. Retorna null se não configurado.
 */
export async function getClicksignCredentialsForTenant(
  serviceClient: any,
  tenantId: string,
): Promise<{ token: string; hmacSecret: string | null } | null> {
  const { data, error } = await serviceClient
    .from("integrations")
    .select("api_key, api_secret, is_active")
    .eq("tenant_id", tenantId)
    .eq("slug", "clicksign")
    .eq("is_active", true)
    .maybeSingle();
  if (error || !data?.api_key) return null;
  return { token: data.api_key as string, hmacSecret: (data.api_secret as string) ?? null };
}

/**
 * Valida assinatura HMAC-SHA256 enviada pela Clicksign no header `Content-Hmac`.
 * Formato do header: "sha256=<hex>"
 */
export async function verifyClicksignHmac(
  rawBody: string,
  headerValue: string | null,
  secret: string,
): Promise<boolean> {
  if (!headerValue) return false;
  const expectedHex = headerValue.replace(/^sha256=/, "").trim().toLowerCase();
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const computedHex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  // Timing-safe-ish compare
  if (computedHex.length !== expectedHex.length) return false;
  let diff = 0;
  for (let i = 0; i < computedHex.length; i++) {
    diff |= computedHex.charCodeAt(i) ^ expectedHex.charCodeAt(i);
  }
  return diff === 0;
}
