import { useState } from "react";
import { Copy, CheckCircle2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copiado!" });
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={copy}>
      {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  return (
    <div className="relative group">
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton text={code} />
      </div>
      <pre className="bg-muted/60 rounded-md px-4 py-3 text-xs font-mono overflow-x-auto leading-relaxed">
        {code}
      </pre>
    </div>
  );
}

const METHOD_STYLES: Record<string, string> = {
  GET:  "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  POST: "bg-green-500/15 text-green-600 dark:text-green-400",
};

interface Endpoint {
  method: string;
  path: string;
  scope: string;
  description: string;
  queryParams?: { name: string; type: string; required: boolean; description: string }[];
  bodyParams?: { name: string; type: string; required: boolean; description: string }[];
  exampleRequest: string;
  exampleResponse: string;
}

const BASE_URL = "https://<project>.supabase.co/functions/v1/api-gateway";

const ENDPOINTS: Endpoint[] = [
  {
    method: "GET",
    path: "/api/v1/pj",
    scope: "pj:read",
    description: "Lista todos os prestadores de serviço (PJs) do tenant.",
    queryParams: [
      { name: "page",     type: "integer", required: false, description: "Página (padrão: 1)" },
      { name: "per_page", type: "integer", required: false, description: "Itens por página, máx 100 (padrão: 20)" },
    ],
    exampleRequest: `curl -X GET "${BASE_URL}/api/v1/pj?page=1&per_page=10" \\
  -H "X-API-Key: axk_sua_chave_aqui"`,
    exampleResponse: `{
  "data": [
    {
      "id": "uuid",
      "name": "Dr. João Silva",
      "cnpj": "12.345.678/0001-00",
      "email": "joao@exemplo.com",
      "status": "ativo",
      "created_at": "2026-01-15T10:00:00Z"
    }
  ],
  "meta": { "total": 42, "page": 1, "per_page": 10 }
}`,
  },
  {
    method: "GET",
    path: "/api/v1/pj/:id",
    scope: "pj:read",
    description: "Retorna detalhes de um prestador específico.",
    exampleRequest: `curl -X GET "${BASE_URL}/api/v1/pj/uuid-do-pj" \\
  -H "X-API-Key: axk_sua_chave_aqui"`,
    exampleResponse: `{
  "data": {
    "id": "uuid",
    "name": "Dr. João Silva",
    "cnpj": "12.345.678/0001-00",
    "email": "joao@exemplo.com",
    "phone": "(11) 99999-9999",
    "status": "ativo",
    "created_at": "2026-01-15T10:00:00Z"
  }
}`,
  },
  {
    method: "GET",
    path: "/api/v1/pj/:id/contracts",
    scope: "contracts:read",
    description: "Lista os contratos vinculados a um prestador.",
    queryParams: [
      { name: "page",     type: "integer", required: false, description: "Página" },
      { name: "per_page", type: "integer", required: false, description: "Itens por página" },
    ],
    exampleRequest: `curl -X GET "${BASE_URL}/api/v1/pj/uuid-do-pj/contracts" \\
  -H "X-API-Key: axk_sua_chave_aqui"`,
    exampleResponse: `{
  "data": [
    { "id": "uuid", "title": "Contrato 2026", "status": "ativo",
      "start_date": "2026-01-01", "end_date": "2026-12-31" }
  ],
  "meta": { "total": 1, "page": 1, "per_page": 20 }
}`,
  },
  {
    method: "GET",
    path: "/api/v1/pj/:id/repasses",
    scope: "pj:read",
    description: "Lista o histórico de repasses de um prestador.",
    queryParams: [
      { name: "page",     type: "integer", required: false, description: "Página" },
      { name: "per_page", type: "integer", required: false, description: "Itens por página" },
    ],
    exampleRequest: `curl -X GET "${BASE_URL}/api/v1/pj/uuid-do-pj/repasses" \\
  -H "X-API-Key: axk_sua_chave_aqui"`,
    exampleResponse: `{
  "data": [
    { "id": "uuid", "valor": 5000.00, "status": "processado",
      "conciliation_status": "conciliado", "data_repasse": "2026-06-01" }
  ],
  "meta": { "total": 12, "page": 1, "per_page": 20 }
}`,
  },
  {
    method: "GET",
    path: "/api/v1/nf",
    scope: "nf:read",
    description: "Lista notas fiscais. Suporta filtros por status e PJ.",
    queryParams: [
      { name: "status",   type: "string",  required: false, description: "pendente | aprovada | rejeitada" },
      { name: "pj_id",   type: "uuid",    required: false, description: "Filtrar por prestador" },
      { name: "page",     type: "integer", required: false, description: "Página" },
      { name: "per_page", type: "integer", required: false, description: "Itens por página" },
    ],
    exampleRequest: `curl -X GET "${BASE_URL}/api/v1/nf?status=pendente&page=1" \\
  -H "X-API-Key: axk_sua_chave_aqui"`,
    exampleResponse: `{
  "data": [
    { "id": "uuid", "numero_nf": "000001", "valor": 3500.00,
      "status": "pendente", "sefaz_status": "autorizada" }
  ],
  "meta": { "total": 5, "page": 1, "per_page": 20 }
}`,
  },
  {
    method: "POST",
    path: "/api/v1/nf",
    scope: "nf:write",
    description: "Submete uma nova nota fiscal para aprovação.",
    bodyParams: [
      { name: "pj_id",      type: "uuid",   required: true,  description: "ID do prestador" },
      { name: "numero_nf",  type: "string", required: true,  description: "Número da NF" },
      { name: "valor",      type: "number", required: true,  description: "Valor bruto (R$)" },
      { name: "chave_nfe",  type: "string", required: false, description: "Chave de acesso NFe (44 dígitos)" },
      { name: "nf_due_date",type: "date",   required: false, description: "Data de vencimento (YYYY-MM-DD)" },
    ],
    exampleRequest: `curl -X POST "${BASE_URL}/api/v1/nf" \\
  -H "X-API-Key: axk_sua_chave_aqui" \\
  -H "Content-Type: application/json" \\
  -d '{
    "pj_id": "uuid-do-pj",
    "numero_nf": "000042",
    "valor": 3500.00,
    "nf_due_date": "2026-07-15"
  }'`,
    exampleResponse: `{
  "data": {
    "id": "uuid-da-nova-nf",
    "status": "pendente",
    "created_at": "2026-06-22T14:00:00Z"
  }
}`,
  },
  {
    method: "GET",
    path: "/api/v1/nf/:id",
    scope: "nf:read",
    description: "Retorna detalhes de uma nota fiscal, incluindo validação SEFAZ.",
    exampleRequest: `curl -X GET "${BASE_URL}/api/v1/nf/uuid-da-nf" \\
  -H "X-API-Key: axk_sua_chave_aqui"`,
    exampleResponse: `{
  "data": {
    "id": "uuid",
    "numero_nf": "000042",
    "valor": 3500.00,
    "status": "aprovada",
    "sefaz_status": "autorizada",
    "chave_nfe": "35260...44 digitos...",
    "nf_due_date": "2026-07-15"
  }
}`,
  },
  {
    method: "GET",
    path: "/api/v1/documents/:pjId",
    scope: "documents:read",
    description: "Lista documentos enviados por um prestador.",
    queryParams: [
      { name: "page",     type: "integer", required: false, description: "Página" },
      { name: "per_page", type: "integer", required: false, description: "Itens por página" },
    ],
    exampleRequest: `curl -X GET "${BASE_URL}/api/v1/documents/uuid-do-pj" \\
  -H "X-API-Key: axk_sua_chave_aqui"`,
    exampleResponse: `{
  "data": [
    { "id": "uuid", "file_name": "contrato_social.pdf",
      "validation_status": "valido", "expires_at": "2027-01-01" }
  ],
  "meta": { "total": 3, "page": 1, "per_page": 20 }
}`,
  },
];

function EndpointCard({ ep }: { ep: Endpoint }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
        onClick={() => setOpen((p) => !p)}
      >
        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-bold w-12 justify-center shrink-0 ${METHOD_STYLES[ep.method] ?? "bg-muted"}`}>
          {ep.method}
        </span>
        <code className="text-sm font-mono flex-1">{ep.path}</code>
        <Badge variant="outline" className="text-[10px] font-mono shrink-0">{ep.scope}</Badge>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-border px-4 py-4 space-y-4">
          <p className="text-sm text-muted-foreground">{ep.description}</p>

          {ep.queryParams && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Query Params</p>
              <div className="space-y-1.5">
                {ep.queryParams.map((p) => (
                  <div key={p.name} className="flex items-start gap-2 text-sm">
                    <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded w-28 shrink-0">{p.name}</code>
                    <span className="text-xs text-muted-foreground w-14 shrink-0">{p.type}</span>
                    {p.required && <Badge variant="destructive" className="text-[9px] h-4 shrink-0">req</Badge>}
                    <span className="text-xs text-muted-foreground">{p.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ep.bodyParams && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Body (JSON)</p>
              <div className="space-y-1.5">
                {ep.bodyParams.map((p) => (
                  <div key={p.name} className="flex items-start gap-2 text-sm">
                    <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded w-28 shrink-0">{p.name}</code>
                    <span className="text-xs text-muted-foreground w-14 shrink-0">{p.type}</span>
                    {p.required && <Badge variant="destructive" className="text-[9px] h-4 shrink-0">req</Badge>}
                    <span className="text-xs text-muted-foreground">{p.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Exemplo de Request</p>
              <CodeBlock code={ep.exampleRequest} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Exemplo de Response</p>
              <CodeBlock code={ep.exampleResponse} language="json" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ApiDocsPage() {
  return (
    <div className="space-y-8">
      {/* Auth */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Autenticação</h2>
        <p className="text-sm text-muted-foreground">
          Todas as requisições devem incluir a chave de API no header <code className="text-xs font-mono bg-muted px-1 py-0.5 rounded">X-API-Key</code>.
          Alternativamente, use <code className="text-xs font-mono bg-muted px-1 py-0.5 rounded">Authorization: Bearer &lt;chave&gt;</code>.
        </p>
        <CodeBlock code={`curl -H "X-API-Key: axk_sua_chave_aqui" ${BASE_URL}/api/v1/pj`} />
      </section>

      {/* Base URL */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Base URL</h2>
        <CodeBlock code={BASE_URL} />
        <p className="text-xs text-muted-foreground">
          Substitua <code className="font-mono">&lt;project&gt;</code> pelo ID do seu projeto Supabase.
        </p>
      </section>

      {/* Rate Limiting */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Rate Limiting</h2>
        <p className="text-sm text-muted-foreground">
          O limite de requisições é configurável por chave (padrão: 60 req/min).
          Quando excedido, a API retorna <code className="text-xs font-mono bg-muted px-1 py-0.5 rounded">429 Too Many Requests</code>.
        </p>
      </section>

      {/* Error codes */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Códigos de Erro</h2>
        <div className="rounded-lg border border-border overflow-hidden">
          {[
            { code: "401", title: "Unauthorized", desc: "X-API-Key ausente ou inválida" },
            { code: "403", title: "Forbidden", desc: "Chave revogada, expirada ou escopo insuficiente" },
            { code: "404", title: "Not Found", desc: "Recurso não encontrado" },
            { code: "422", title: "Unprocessable Entity", desc: "Campos obrigatórios ausentes no body" },
            { code: "429", title: "Too Many Requests", desc: "Rate limit excedido" },
            { code: "500", title: "Internal Server Error", desc: "Erro interno do servidor" },
          ].map((e, i) => (
            <div key={e.code} className={`flex items-center gap-4 px-4 py-2.5 text-sm ${i > 0 ? "border-t border-border" : ""}`}>
              <span className={`font-mono font-bold w-10 ${Number(e.code) < 500 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}`}>
                {e.code}
              </span>
              <span className="font-medium w-44">{e.title}</span>
              <span className="text-muted-foreground">{e.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Webhook events */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Eventos de Webhook</h2>
        <p className="text-sm text-muted-foreground">
          Configure webhooks em <strong>Gestão de API → Webhooks</strong>. Cada disparo inclui o header
          <code className="text-xs font-mono bg-muted px-1 py-0.5 rounded mx-1">X-Webhook-Signature</code>
          (HMAC SHA256 do payload com o secret da chave).
        </p>
        <CodeBlock code={`// Verificar assinatura (Node.js)
const crypto = require("crypto");
const sig = crypto.createHmac("sha256", WEBHOOK_SECRET)
  .update(rawBody)
  .digest("hex");
if (sig !== req.headers["x-webhook-signature"]) {
  return res.status(401).send("Invalid signature");
}`} language="js" />
      </section>

      {/* Endpoints */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Endpoints</h2>
        <div className="space-y-2">
          {ENDPOINTS.map((ep) => (
            <EndpointCard key={`${ep.method}-${ep.path}`} ep={ep} />
          ))}
        </div>
      </section>
    </div>
  );
}
