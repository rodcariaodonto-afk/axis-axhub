## Objetivo

Substituir o sistema atual de assinatura por OTP por integração nativa com **Clicksign API v1**, em produção, com token configurado **por tenant** na tabela `integrations` (padrão multi-tenant igual RH AXHolding).

## Arquitetura

```text
ContractDetail (UI)
   │  "Enviar para Clicksign"
   ▼
clicksign-send (Edge Function)  ─► Clicksign API (upload doc + signers + lists)
   │                                        │
   │ grava provider_envelope_id             │  emails automáticos
   ▼                                        ▼
contracts.signature_status = 'Pending'    Signatários assinam
                                            │
                                            ▼
                              clicksign-webhook (Edge Function, verify_jwt=false)
                                            │  HMAC validation
                                            ▼
                              contracts.signature_status = 'Signed'
                              + download PDF assinado → bucket signed-contracts
                              + signature_audit_logs (auditoria)
                              + notificação in-app
```

## Mudanças

### 1. Banco de dados (migration)

- Adicionar colunas em `contracts`:
  - `clicksign_document_key` (text)
  - `clicksign_envelope_url` (text) — link público de assinatura
  - `clicksign_sent_at` (timestamptz)
- Adicionar `signature_status` valores: `'Pending'`, `'PartiallySigned'`, `'Signed'`, `'Refused'`, `'Cancelled'`.
- Tabela nova `contract_signers` (já que Clicksign suporta múltiplos signatários):
  - `id`, `contract_id`, `tenant_id`, `email`, `full_name`, `signing_order`, `provider_signer_id`, `signed_at`, `status`
- RLS por `tenant_id` via `get_user_tenant_id()`.

### 2. Configuração da integração

- A integração **Clicksign** já existe no catálogo (`src/components/integrations/connectorsCatalog.ts`).
- Em **Configurações → Integrações → Clicksign**, usuário cola:
  - `api_key` = Access Token Clicksign
  - `api_secret` = HMAC Secret (para validar webhook)
  - `webhook_url` (read-only, gerada pela plataforma)
- Validação real do token ao salvar (chamada de teste à API Clicksign).

### 3. Edge Functions (3 novas)

`**supabase/functions/_shared/clicksign-provider.ts**`

- Porta do adapter do RH AXHolding (Clicksign API v1).
- `createEnvelope`, `parseWebhook`, `downloadSignedDocument`.
- `getClicksignTokenForTenant(tenant_id)` lê da tabela `integrations`.

`**supabase/functions/clicksign-send/index.ts**` (`verify_jwt=true`)

- Input: `{ contract_id, signers: [{email, name, signing_order?}] }` (Zod).
- Gera PDF do contrato (HTML → PDF via existing logic).
- Upload Storage → URL assinada.
- Chama Clicksign: upload doc + cria signers + binda lista.
- Persiste `clicksign_document_key`, `contract_signers`.
- Atualiza `signature_status='Pending'`.

`**supabase/functions/clicksign-webhook/index.ts**` (`verify_jwt=false`)

- Valida HMAC-SHA256 com `api_secret` do tenant (header `Content-Hmac`).
- Identifica tenant via `clicksign_document_key`.
- Eventos tratados: `add_signer`, `sign`, `auto_close`, `close`, `refusal`, `cancel`, `deadline`.
- No `auto_close`/`close`: baixa PDF assinado do Clicksign → upload `signed-contracts` bucket → atualiza `contracts.document_url`, `signed_at`, `signature_status='Signed'`.
- Cria registro em `signature_audit_logs` e dispara notificação interna.

### 4. Frontend (`src/pages/ContractDetail.tsx`)

- **Remover bloco OTP** (componentes InputOTP + verify-and-sign).
- Nova aba/seção **"Assinatura Digital"**:
  - Lista de signatários (add/remove email + nome).
  - Botão "**Enviar para Clicksign**" (desabilitado se integração não configurada — tooltip explica).
  - Status visual em tempo real via Supabase Realtime na `contracts.signature_status`.
  - Card de auditoria mostrando cada signatário, IP, timestamp, status.
  - Botão "Baixar contrato assinado" quando `status='Signed'`.

### 5. Limpeza

- Remover edge function `verify-and-sign` (após migração).
- Manter `signature_audit_logs` (reutilizada pelo novo fluxo).
- Atualizar memória `electronic-signature-legal` para refletir Clicksign.

## Detalhes técnicos

- **API Clicksign**: `https://app.clicksign.com/api/v1` (produção). Header `Content-Type: application/json`, token via query string `?access_token=`.
- **Webhook URL** exposta ao usuário: `https://dgybxarkvmaajfeesqdv.supabase.co/functions/v1/clicksign-webhook` — usuário copia e cola no painel Clicksign.
- **HMAC**: Clicksign envia header `Content-Hmac: sha256=<hex>` — comparamos com `hmacSHA256(rawBody, api_secret)`.
- **PDF**: usar geração HTML existente em `ContractDetail` (já temos `replaceMacros`). Conversão server-side via Puppeteer não funciona em Edge — vamos enviar HTML pra Clicksign via `content_url` apontando para uma rota pública assinada do próprio Supabase Storage (gera PDF prévio no cliente com html2pdf ou jsPDF antes de chamar `clicksign-send`).
- **Multi-tenant**: cada chamada lê `integrations` filtrando por `tenant_id + slug='clicksign' + is_active=true`. Sem token → erro claro "Configure Clicksign em Configurações → Integrações".
- **Logs**: `reqId` em cada edge function (padrão do projeto).

## Entregáveis

1. 1 migration (colunas + tabela `contract_signers` + RLS).
2. 3 edge functions (provider compartilhado + send + webhook).
3. Refatoração de `ContractDetail.tsx` (remoção OTP + nova UI Clicksign).
4. Atualização do `IntegrationSetup` para mostrar webhook URL e botão "Testar token".
5. Atualização da memória `electronic-signature-legal`.

## Pré-requisitos do usuário

Após o build, você vai precisar:

1. Criar conta/usar conta existente no Clicksign **produção**.
2. Em **Configurações → Integrações → Clicksign**, colar o **Access Token** + **HMAC Secret**.
3. No painel Clicksign, cadastrar a Webhook URL exibida na tela.

**Você não precisa me passar o token agora** — cada empresa cliente vai colar o próprio.  
  
ok, voce vai precisar do webhook? quer a documentaçao da API?