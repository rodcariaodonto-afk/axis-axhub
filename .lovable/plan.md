

# Sistema de Integracoes - Conectores Escalavel

## Visao Geral

Evoluir o modulo de integracoes atual (tabela simples com platform/api_key) para um framework completo com catalogo de conectores, webhooks dedicados, logs de execucao, mapeamento de campos e interface de configuracao em etapas.

## O que existe hoje

- Tabela `integrations` basica com campos: platform, api_key, api_secret, webhook_url, is_active
- UI simples com lista de integracoes e dialog para adicionar nova
- Edge function `whatsapp-webhook` para busca de produtos
- Edge function `dispatch-events` para despacho via event_outbox

## O que sera construido

### 1. Evolucao do banco de dados

**Alterar tabela `integrations`** - adicionar colunas:
- `name` (VARCHAR 255) - nome amigavel
- `slug` (VARCHAR 100) - identificador unico
- `description` (TEXT)
- `icon_url` (VARCHAR 500)
- `type` (VARCHAR 50) - 'zapier', 'make', 'native', 'webhook'
- `category` (VARCHAR 50) - 'crm', 'erp', 'communication', 'payment', 'storage', 'productivity'
- `auth_type` (VARCHAR 50) - 'oauth2', 'api_key', 'webhook'
- `config` (JSONB) - configuracoes extras criptografadas
- `is_configured` (BOOLEAN default false)
- `last_sync_at` (TIMESTAMPTZ)
- `created_by` (UUID)

**Nova tabela `integration_webhooks`:**
- id, integration_id (FK), tenant_id, webhook_url (unico), webhook_secret, events (TEXT[]), is_active, last_triggered_at, failed_attempts, created_at

**Nova tabela `integration_logs`:**
- id, integration_id (FK), tenant_id, event_type, action ('send'/'receive'/'sync'), request_payload (JSONB), response_payload (JSONB), status ('success'/'failed'/'pending'), error_message, duration_ms, created_at

**Nova tabela `integration_mappings`:**
- id, integration_id (FK), tenant_id, axhub_field, external_field, transform_type ('direct'/'custom'/'lookup'), transform_config (JSONB), created_at

Todas com RLS por tenant_id e restricao de escrita para admins.

### 2. Catalogo de conectores pre-definidos

Tabela de referencia (ou constante no frontend) com conectores disponiveis:

| Conector | Tipo | Categoria | Auth |
|----------|------|-----------|------|
| Zapier | zapier | productivity | webhook |
| Make (Integromat) | make | productivity | webhook |
| N8N | native | productivity | api_key |
| WhatsApp API | native | communication | api_key |
| Gmail API | native | communication | oauth2 |
| Shopify | native | erp | api_key |
| MercadoLivre | native | erp | oauth2 |
| Slack | native | communication | webhook |
| Stripe | native | payment | api_key |
| HubSpot | native | crm | api_key |

### 3. Edge Function - Webhook Receiver Generico

Nova edge function `webhook-receiver` que:
- Recebe POST com integration_id e webhook_id na URL
- Valida assinatura HMAC-SHA256 via header X-Webhook-Signature
- Registra o evento na tabela integration_logs
- Aplica mapeamento de campos (integration_mappings)
- Cria/atualiza registros no AXHUB (leads, customers, products)
- Retorna 200 OK

### 4. Componentes React

**IntegrationCatalog** - Grid de cards com conectores disponiveis, filtro por categoria e tipo, botao "Conectar"

**IntegrationCard** - Card visual com icone, nome, descricao, badge de status (conectado/desconectado), acoes

**IntegrationSetup** - Dialog com wizard de 3 etapas:
1. Autenticacao (API Key ou OAuth2 redirect)
2. Mapeamento de campos (drag & drop dos campos AXHUB para campos externos)
3. Teste de conexao (envio de evento de teste e exibicao do resultado)

**IntegrationLogs** - Tabela com logs de execucao, filtros por status, auto-refresh a cada 5s

**IntegrationDetail** - Painel completo da integracao com abas: Configuracao, Webhooks, Mapeamento, Logs

### 5. Reescrita da pagina IntegrationsSettings

A pagina atual sera substituida por uma interface com 3 abas:
- **Catalogo**: grid de conectores disponiveis para instalar
- **Minhas Integracoes**: integracoes configuradas com status e acoes
- **Logs**: historico de execucoes com filtros

### 6. Eventos suportados para webhooks

Reutilizar os 16 eventos ja definidos no event_outbox:
- lead.created, lead.updated, deal.won, deal.lost, order.created, order.paid, customer.created, product.updated, etc.

## Adaptacoes da spec ao projeto

- `workspace_id` sera `tenant_id` (padrao do projeto)
- Sem Redis/Bull - usar o padrao event_outbox existente para processamento assincrono
- Sem Node.js crypto - usar Web Crypto API no Deno (edge functions)
- RLS usando `get_user_tenant_id()` e `has_role()` existentes
- Autenticacao OAuth2 sera simplificada (armazenar tokens, sem fluxo completo de redirect por enquanto)

## Detalhes Tecnicos

### Migracao SQL

```sql
-- Evolucao da tabela integrations
ALTER TABLE integrations
  ADD COLUMN IF NOT EXISTS name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS slug VARCHAR(100),
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS icon_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'native',
  ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'productivity',
  ADD COLUMN IF NOT EXISTS auth_type VARCHAR(50) DEFAULT 'api_key',
  ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_configured BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by UUID;

-- Novas tabelas
CREATE TABLE integration_webhooks (...);
CREATE TABLE integration_logs (...);
CREATE TABLE integration_mappings (...);

-- Indices e RLS
```

### Edge Function webhook-receiver

```typescript
// POST /webhook-receiver?integration_id=xxx&webhook_id=yyy
// Valida HMAC, registra log, aplica mapeamento, cria registros
```

### Estrutura de arquivos

```text
src/components/integrations/
  IntegrationCatalog.tsx
  IntegrationCard.tsx
  IntegrationSetup.tsx
  IntegrationLogs.tsx
  IntegrationDetail.tsx
src/pages/settings/IntegrationsSettings.tsx (reescrita)
supabase/functions/webhook-receiver/index.ts (nova)
```

## Sequencia de implementacao

1. Criar migracao com alteracao da tabela integrations + 3 novas tabelas + indices + RLS
2. Criar edge function webhook-receiver
3. Criar componentes React (Catalog, Card, Setup, Logs, Detail)
4. Reescrever IntegrationsSettings com 3 abas
5. Integrar catalogo de conectores pre-definidos

