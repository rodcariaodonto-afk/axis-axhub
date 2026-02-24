

# Refatoracao Completa - AXIS Nivel Salesforce

## Analise do Documento vs. Realidade Atual

O PDF foi escrito para um projeto generico e referencia tabelas/conceitos que **nao existem** no AXIS atual:

| PDF Referencia | AXIS Atual | Status |
|---|---|---|
| `workspaces` + `workspace_id` | `tenant_id` + RLS via `get_user_tenant_id()` | Ja existe (diferente nome) |
| `accounts` | `crm_accounts` | Ja existe |
| `contacts` | `contacts` | Ja existe |
| `leads` | `leads` | Ja existe |
| `opportunities` | `deals` | Ja existe (diferente nome) |
| `activities` | `activities` | Ja existe |
| `contracts` | -- | **NAO EXISTE** (novo) |
| `clientes_old` / `contatos_old` | -- | Nao existem (migracao nao se aplica) |
| `invoices` | `receivables` + `payables` | Ja existe (diferente modelo) |

## O Que Realmente Precisa Ser Feito

Em vez de reescrever tudo (que quebraria campanhas, funis, WhatsApp, BI e todas as integracoes), vamos **alinhar** a arquitetura existente ao padrao Salesforce com as seguintes mudancas:

### Fase 1: Novas Tabelas

1. **Criar tabela `contracts`** - Contratos vinculados a accounts e deals
   - Campos: `id`, `tenant_id`, `account_id`, `deal_id`, `name`, `status`, `start_date`, `end_date`, `value`, `document_url`, `created_at`, `updated_at`
   - RLS com tenant isolation

2. **Adicionar campo `is_converted` na tabela `leads`** (se nao existir) para rastrear conversao formal Lead -> Deal + Contact + Account

### Fase 2: Melhorias na Logica de Conversao de Leads

3. **Aprimorar o fluxo de conversao de Lead** na pagina `Leads.tsx`:
   - Ao converter, criar automaticamente um `crm_account` (se nao existir)
   - Criar um `contact` vinculado ao account
   - Criar o `deal` vinculado ao account e contact
   - Marcar o lead como `is_converted = true`

### Fase 3: Modulo de Contratos

4. **Criar pagina `Contracts.tsx`** com CRUD completo
   - Listagem com filtros por status e account
   - Formulario de criacao/edicao
   - Upload de documento (PDF)
   - Vinculacao com account e deal

5. **Adicionar rota e link no sidebar**

### Fase 4: Indices de Performance

6. **Criar indices nas tabelas existentes** para melhorar queries:
   - `idx_contacts_account_id` em `contacts(account_id)`
   - `idx_leads_status` em `leads(status)` (se nao existir)
   - `idx_deals_stage_id` em `deals(stage_id)`
   - `idx_deals_pipeline_id` em `deals(pipeline_id)`

### Fase 5: Melhorias nas Activities

7. **Adicionar campos `related_to_account_id` e `related_to_contact_id`** na tabela `activities` (alem dos ja existentes `deal_id`, `lead_id`, `contact_id`)
   - Permitir vincular atividades diretamente a accounts

## O Que NAO Sera Alterado (Preservado)

- Arquitetura `tenant_id` + RLS (equivalente funcional ao `workspace_id`)
- Tabela `crm_accounts` (nao renomear para `accounts` - quebraria todas as queries)
- Tabela `deals` (nao renomear para `opportunities`)
- Todas as integracoes: WhatsApp, Campanhas, Funis, BI, Workflows
- Sistema de autenticacao e RBAC existente
- Edge Functions existentes

## Detalhes Tecnicos

### Migracao SQL (Fase 1)

```text
-- Tabela de Contratos
CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  account_id uuid REFERENCES public.crm_accounts(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'Em elaboracao',
  start_date date,
  end_date date,
  value numeric,
  document_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.contracts FOR ALL
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- Adicionar is_converted ao leads (se nao existir)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS is_converted boolean DEFAULT false;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS converted_at timestamptz;

-- Indices
CREATE INDEX IF NOT EXISTS idx_contacts_account ON public.contacts(account_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON public.deals(stage_id);
CREATE INDEX IF NOT EXISTS idx_deals_pipeline ON public.deals(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_contracts_account ON public.contracts(account_id);
```

### Arquivos a Criar/Modificar

| Arquivo | Acao |
|---|---|
| `src/pages/Contracts.tsx` | Criar - CRUD de contratos |
| `src/pages/Leads.tsx` | Modificar - Melhorar conversao |
| `src/components/AppSidebar.tsx` | Modificar - Adicionar link Contratos |
| `src/App.tsx` | Modificar - Adicionar rota |
| Migration SQL | Criar - Tabela contracts + indices |

### Estimativa

- 1 migracao de banco
- 1 pagina nova (Contracts)
- 2-3 arquivos modificados
- Zero risco para funcionalidades existentes

