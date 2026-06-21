# Especificação: Gestão de PJ — Fase 3 (Otimização)

## 1. Visão Geral

- **Nome:** Módulo de Gestão de PJ — Fase 3 (Otimização)
- **Objetivo:** Elevar o AXIS de ferramenta interna a plataforma competitiva com validação fiscal real, integração bancária, scoring de prestadores e API para integrações externas.
- **Pré-requisito:** Fase 1 + Fase 2 completas.
- **Projeto:** AXIS AXHUB | Supabase: `dgybxarkvmaajfeesqdv`

## 2. Escopo

| # | Sub-módulo | Descrição |
|---|---|---|
| A | Validação SEFAZ | Consulta de NF-e na SEFAZ para autenticidade, integração com Focus NFe |
| B | Integração Bancária | PIX, dados bancários do PJ, preparação para Open Finance, conciliação |
| C | Avaliação de PJ | Score/rating, critérios configuráveis, histórico, ranking |
| D | API Pública | Endpoints REST para integração externa, API keys por tenant, webhooks PJ |

---

## 3. Schema Existente Relevante

### api_keys (já existe)
```
id, tenant_id, user_id, name, api_key, created_at
```
**Reutilizar** — adicionar campos: scopes, rate_limit, is_active, last_used_at, expires_at.

### integration_webhooks (já existe)
```
id, tenant_id, integration_id, webhook_url, webhook_secret, events[], is_active, failed_attempts, last_triggered_at
```
**Reutilizar** — adicionar eventos PJ-específicos.

### bank_accounts (já existe)
```
id, tenant_id, name, bank_code, account_number, balance, created_at
```
**Expandir** — adicionar: agency, pix_key, pix_key_type, cnpj, is_pj_account, pj_id.

### fiscal_settings (já existe)
```
cnpj, company_name, focus_environment, focus_token_*, certificate_*
```
**Usar** — tokens Focus NFe para consulta SEFAZ.

---

## 4. Requisitos Funcionais

### 4.A — Validação SEFAZ

#### RF-SEF01: Consulta de NF-e na SEFAZ
- Ao receber upload de NF XML, após parse local (validate-nf-xml existente):
  - Extrair chave de acesso (chNFe) do XML.
  - Consultar SEFAZ via Focus NFe API (`/v2/nfe/{chave}/consulta`).
  - Validar: NF existe, não está cancelada, valores batem.
- Resultado salvo em `nf_approvals.sefaz_validation` (jsonb).
- Status: `validado_sefaz`, `invalido_sefaz`, `sefaz_indisponivel`.

#### RF-SEF02: Validação Automática vs Manual
- Se Focus NFe tokens configurados no `fiscal_settings` → validação automática no upload.
- Se não configurado → validação manual (admin marca como "verificado manualmente").
- Toggle por tenant em `nf_workflow_config`: `sefaz_validation_enabled` (boolean).

#### RF-SEF03: Dashboard de Validação
- Na página de NF Approvals, exibir badge de validação SEFAZ:
  - ✅ Validado SEFAZ (verde)
  - ⚠️ SEFAZ indisponível (amarelo)
  - ❌ Inválido SEFAZ (vermelho)
  - ⬜ Não verificado (cinza)
- Filtro por status de validação SEFAZ.

#### RF-SEF04: Revalidação
- Botão "Revalidar na SEFAZ" para NFs com status `sefaz_indisponivel`.
- Revalidação em lote: selecionar múltiplas NFs e revalidar.

### 4.B — Integração Bancária

#### RF-BANK01: Dados Bancários do PJ
- Admin cadastra dados bancários do PJ vinculados ao `crm_accounts`:
  - Banco (código + nome), agência, conta, tipo (corrente/poupança).
  - Chave PIX (CPF/CNPJ/email/telefone/aleatória).
  - CNPJ/CPF do titular.
- Armazenado em `bank_accounts` expandido com FK para `crm_accounts`.
- PJ pode visualizar (não editar) seus dados bancários no portal.

#### RF-BANK02: Geração de Payload PIX
- Ao criar repasse (manual ou automático), se PJ tem chave PIX:
  - Gerar payload PIX copia-e-cola (padrão BACEN).
  - Gerar QR Code PIX (para pagamento manual pelo admin no internet banking).
  - Armazenar em `pj_repasse_history.pix_payload` e `pix_qrcode_url`.
- Não faz transferência real — facilita o processo manual.

#### RF-BANK03: Conciliação Bancária
- Admin marca repasse como "pago" e informa:
  - ID da transação bancária (comprovante).
  - Data efetiva do pagamento.
  - Valor efetivamente pago.
- Sistema compara valor pago vs valor esperado:
  - Match exato → conciliado automaticamente.
  - Divergência → flag para revisão manual.
- Status: `pendente` → `pago` → `conciliado` / `divergente`.

#### RF-BANK04: Dashboard Bancário
- Página `/bank-management`:
  - Cards: total a pagar (pendentes), total pago no mês, total conciliado, divergências.
  - Lista de PJs com dados bancários incompletos.
  - Extrato de repasses por conta bancária.

### 4.C — Avaliação de PJ

#### RF-EVAL01: Critérios de Avaliação
- Admin configura critérios por tenant (`pj_evaluation_criteria`):
  - Nome do critério (ex: "Pontualidade", "Qualidade", "Documentação").
  - Peso (1-10) para cálculo do score ponderado.
  - Escala: 1-5 estrelas.
- Critérios default sugeridos na criação do tenant.

#### RF-EVAL02: Avaliação Periódica
- Admin/gestor avalia PJ periodicamente:
  - Seleciona PJ, período de referência.
  - Nota em cada critério (1-5).
  - Comentário geral.
  - Score calculado automaticamente (média ponderada).
- Armazenado em `pj_evaluations` + `pj_evaluation_scores`.

#### RF-EVAL03: Score Composto
- Score final do PJ combina:
  - Média das avaliações manuais (peso configurável).
  - Conformidade documental (% docs válidos, peso configurável).
  - Pontualidade de entrega de NFs (peso configurável).
  - Histórico de rejeições de NF (peso negativo).
- Fórmula configurável por tenant.
- Score atualizado automaticamente quando dados mudam.

#### RF-EVAL04: Dashboard de Ranking
- Página `/pj-ranking`:
  - Ranking de PJs por score (decrescente).
  - Cards: melhor PJ, pior PJ, média geral, PJs abaixo do mínimo.
  - Gráfico de evolução do score ao longo do tempo.
  - Threshold de alerta: score abaixo de X → notificação ao admin.
- PJ vê seu próprio score e avaliações no portal (sem ver ranking geral).

### 4.D — API Pública

#### RF-API01: Gestão de API Keys
- Expandir `api_keys` existente:
  - `scopes`: array de permissões (ex: ['pj:read', 'nf:read', 'nf:write', 'repasse:read']).
  - `rate_limit`: requests/minuto (default 60).
  - `is_active`: toggle on/off.
  - `last_used_at`: tracking de uso.
  - `expires_at`: expiração opcional.
- Admin gera/revoga API keys na interface.
- Mascaramento: key visível apenas na criação, depois mostra últimos 4 chars.

#### RF-API02: Endpoints REST
- Edge function `api-gateway` que roteia requisições baseado no path:
  - `GET /api/v1/pj` — lista PJs do tenant
  - `GET /api/v1/pj/:id` — detalhe de um PJ
  - `GET /api/v1/pj/:id/contracts` — contratos do PJ
  - `GET /api/v1/pj/:id/repasses` — repasses do PJ
  - `GET /api/v1/nf` — lista NFs pendentes/aprovadas
  - `POST /api/v1/nf` — submeter NF via API
  - `GET /api/v1/nf/:id` — detalhe de uma NF
  - `GET /api/v1/documents/:pjId` — docs de um PJ
- Autenticação via header `X-API-Key`.
- Rate limiting por API key.
- Respostas em JSON padronizado.

#### RF-API03: Webhooks PJ
- Eventos disponíveis para webhook:
  - `nf.submitted` — NF submetida
  - `nf.approved` — NF aprovada
  - `nf.rejected` — NF rejeitada
  - `repasse.created` — repasse criado
  - `repasse.paid` — repasse pago
  - `document.expiring` — documento vencendo
  - `contract.expiring` — contrato vencendo
  - `evaluation.created` — avaliação criada
- Reutilizar `integration_webhooks` existente, adicionando novos eventos.
- Retry: 3 tentativas com backoff exponencial (1min, 5min, 30min).

#### RF-API04: Documentação da API
- Página `/api-docs` com:
  - Lista de endpoints com descrição.
  - Exemplos de request/response.
  - Guia de autenticação.
  - Gerada automaticamente a partir dos endpoints.

---

## 5. Regras de Negócio

### RN-F3-01: SEFAZ é opcional
- Funciona sem Focus NFe configurado. Validação SEFAZ é bonus, não bloqueante.
- Se SEFAZ indisponível, NF segue workflow normal.

### RN-F3-02: PIX não faz transferência real
- O sistema gera payload/QR Code para facilitar pagamento manual.
- Integração com API bancária real é futuro (Open Finance).

### RN-F3-03: Score é informativo
- Score não bloqueia operações automaticamente.
- Admin decide ações baseado no score (renovar contrato ou não).
- Threshold de alerta é configurável.

### RN-F3-04: API respeita RLS
- Toda query via API filtra por tenant da API key.
- Scopes limitam quais recursos a key pode acessar.
- Rate limit previne abuso.

### RN-F3-05: Dados bancários são sensíveis
- Chave PIX e conta bancária mascarados na listagem (mostrar últimos 4 chars).
- Log de acesso a dados bancários no audit trail.
- PJ vê seus próprios dados no portal sem mascaramento.

---

## 6. Modelo de Dados

### 6.1 ALTERs em tabelas existentes

```sql
-- api_keys: expandir com scopes, rate limit, controle
ALTER TABLE public.api_keys
  ADD COLUMN IF NOT EXISTS scopes text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS rate_limit integer DEFAULT 60,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_used_at timestamptz,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- bank_accounts: expandir com dados PJ
ALTER TABLE public.bank_accounts
  ADD COLUMN IF NOT EXISTS agency text,
  ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'corrente',
  ADD COLUMN IF NOT EXISTS pix_key text,
  ADD COLUMN IF NOT EXISTS pix_key_type text,
  ADD COLUMN IF NOT EXISTS cnpj_titular text,
  ADD COLUMN IF NOT EXISTS pj_id uuid REFERENCES public.crm_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bank_accounts_pj
  ON public.bank_accounts(tenant_id, pj_id) WHERE pj_id IS NOT NULL;

-- nf_approvals: adicionar validação SEFAZ
ALTER TABLE public.nf_approvals
  ADD COLUMN IF NOT EXISTS chave_nfe text,
  ADD COLUMN IF NOT EXISTS sefaz_validation jsonb,
  ADD COLUMN IF NOT EXISTS sefaz_status text DEFAULT 'nao_verificado';

-- nf_workflow_config: toggle SEFAZ
ALTER TABLE public.nf_workflow_config
  ADD COLUMN IF NOT EXISTS sefaz_validation_enabled boolean DEFAULT false;

-- pj_repasse_history: campos PIX e conciliação
ALTER TABLE public.pj_repasse_history
  ADD COLUMN IF NOT EXISTS pix_payload text,
  ADD COLUMN IF NOT EXISTS pix_qrcode_url text,
  ADD COLUMN IF NOT EXISTS transaction_id text,
  ADD COLUMN IF NOT EXISTS paid_date date,
  ADD COLUMN IF NOT EXISTS paid_amount numeric,
  ADD COLUMN IF NOT EXISTS conciliation_status text DEFAULT 'pendente';
```

### 6.2 Novas Tabelas

```sql
-- === MÓDULO C: Avaliação de PJ ===

CREATE TABLE IF NOT EXISTS public.pj_evaluation_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  weight integer NOT NULL DEFAULT 5 CHECK (weight BETWEEN 1 AND 10),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pj_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  pj_id uuid NOT NULL REFERENCES public.crm_accounts(id) ON DELETE CASCADE,
  evaluator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  overall_score numeric NOT NULL DEFAULT 0,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pj_evaluation_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id uuid NOT NULL REFERENCES public.pj_evaluations(id) ON DELETE CASCADE,
  criteria_id uuid NOT NULL REFERENCES public.pj_evaluation_criteria(id) ON DELETE CASCADE,
  score integer NOT NULL CHECK (score BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pj_composite_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  pj_id uuid NOT NULL REFERENCES public.crm_accounts(id) ON DELETE CASCADE,
  evaluation_score numeric NOT NULL DEFAULT 0,
  compliance_score numeric NOT NULL DEFAULT 0,
  punctuality_score numeric NOT NULL DEFAULT 0,
  rejection_penalty numeric NOT NULL DEFAULT 0,
  final_score numeric NOT NULL DEFAULT 0,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, pj_id)
);

-- === MÓDULO D: API Pública ===

CREATE TABLE IF NOT EXISTS public.api_request_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  api_key_id uuid NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  method text NOT NULL,
  path text NOT NULL,
  status_code integer NOT NULL,
  response_time_ms integer,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.webhook_delivery_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  webhook_id uuid NOT NULL REFERENCES public.integration_webhooks(id) ON DELETE CASCADE,
  event text NOT NULL,
  payload jsonb NOT NULL,
  response_status integer,
  response_body text,
  attempt integer NOT NULL DEFAULT 1,
  delivered_at timestamptz,
  next_retry_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### 6.3 Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_pj_evaluation_criteria_tenant ON public.pj_evaluation_criteria(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pj_evaluations_pj ON public.pj_evaluations(tenant_id, pj_id);
CREATE INDEX IF NOT EXISTS idx_pj_evaluation_scores_eval ON public.pj_evaluation_scores(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_pj_composite_scores_tenant ON public.pj_composite_scores(tenant_id, final_score DESC);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_key ON public.api_request_logs(api_key_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_delivery_logs_webhook ON public.webhook_delivery_logs(webhook_id, created_at DESC);
```

### 6.4 RLS + Triggers

```sql
-- Enable RLS em todas as novas tabelas
ALTER TABLE public.pj_evaluation_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pj_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pj_evaluation_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pj_composite_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_request_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_delivery_logs ENABLE ROW LEVEL SECURITY;

-- Tenant isolation em todas
-- PJ self-access (SELECT) em pj_evaluations, pj_composite_scores
-- Triggers updated_at em pj_evaluation_criteria, pj_evaluations
```

---

## 7. Edge Functions

| Função | Tipo | Descrição |
|---|---|---|
| `validate-nf-sefaz` | POST | Consulta SEFAZ via Focus NFe, valida chave NF-e |
| `generate-pix-payload` | POST | Gera payload PIX + QR Code para repasse |
| `calculate-pj-score` | POST | Calcula score composto do PJ |
| `api-gateway` | POST/GET | Gateway da API pública, roteia por path, valida API key |
| `dispatch-webhook` | POST | Envia webhook para URL cadastrada, com retry |

---

## 8. Frontend

### Novas Páginas
```
/bank-management          — Admin: dados bancários PJ + conciliação + dashboard
/pj-ranking               — Admin: ranking PJs por score + avaliações
/pj-ranking/:pjId         — Admin: avaliação detalhada de um PJ
/api-management            — Admin: API keys + webhooks + logs
/api-docs                  — Documentação da API (público com auth)

/portal/avaliacao         — PJ: ver seu score e avaliações recebidas
/portal/dados-bancarios   — PJ: ver seus dados bancários (read-only)
```

### Novos Componentes
```
src/components/sefaz-validation/
├── SefazValidationBadge.tsx
├── SefazRevalidateButton.tsx
└── SefazBatchRevalidate.tsx

src/components/bank-management/
├── PJBankDataForm.tsx
├── PixPayloadGenerator.tsx
├── ConciliationDashboard.tsx
├── ConciliationForm.tsx
└── BankDashboard.tsx

src/components/pj-evaluation/
├── EvaluationCriteriaConfig.tsx
├── EvaluationForm.tsx
├── EvaluationHistory.tsx
├── CompositeScoreCard.tsx
├── PJRankingDashboard.tsx
└── ScoreEvolutionChart.tsx

src/components/api-management/
├── ApiKeyManager.tsx
├── ApiKeyCreateDialog.tsx
├── WebhookConfig.tsx
├── ApiRequestLogs.tsx
├── ApiDocsPage.tsx
└── WebhookDeliveryLogs.tsx
```

---

## 9. Critérios de Aceite (BDD)

### Validação SEFAZ
- **Dado que** tenant tem Focus NFe configurado e sefaz_validation_enabled = true, **quando** PJ submete NF com XML, **então** sistema consulta SEFAZ e exibe badge de validação.
- **Dado que** SEFAZ está indisponível, **quando** consulta falha, **então** NF segue workflow normal com badge "SEFAZ indisponível".
- **Dado que** NF é inválida na SEFAZ (cancelada ou inexistente), **quando** validação retorna, **então** NF é marcada como invalido_sefaz e admin é notificado.

### Integração Bancária
- **Dado que** PJ tem chave PIX cadastrada, **quando** admin cria repasse, **então** sistema gera payload PIX e QR Code.
- **Dado que** admin marca repasse como pago com valor divergente, **quando** salva, **então** status = divergente e flag para revisão.

### Avaliação de PJ
- **Dado que** admin avalia PJ com nota 4 em 3 critérios (pesos 5, 8, 3), **quando** salva, **então** score = (4*5 + 4*8 + 4*3) / (5+8+3) = 4.0.
- **Dado que** PJ tem score abaixo do threshold (ex: 2.5), **quando** score é recalculado, **então** admin recebe notificação.

### API Pública
- **Dado que** API key tem scope 'pj:read', **quando** faz GET /api/v1/pj, **então** retorna lista de PJs do tenant.
- **Dado que** API key tem scope 'pj:read' mas não 'nf:read', **quando** faz GET /api/v1/nf, **então** retorna 403 Forbidden.
- **Dado que** API key excede rate limit, **quando** faz mais uma request, **então** retorna 429 Too Many Requests.

---

## 10. Riscos

| Risco | Mitigação |
|---|---|
| Focus NFe API instável/lenta | Timeout de 10s, fallback para "não verificado", retry manual |
| QR Code PIX com formato incorreto | Usar lib validada (qrcode), testar com apps bancários reais |
| Score injusto por falta de dados | Exigir mínimo de avaliações antes de publicar score |
| API key vazada | Rate limit, scopes restritos, botão de revogação imediata, log de uso |
| Volume de API requests | Rate limiting por key, paginação obrigatória, purge de logs antigos |
