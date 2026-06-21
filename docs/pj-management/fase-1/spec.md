# Especificação: Gestão de PJ — Fase 1 (MVP)

## 1. Visão Geral

- **Nome:** Módulo de Gestão de Pessoa Jurídica — Fase 1 (MVP)
- **Objetivo:** Permitir que empresas contratantes gerenciem prestadores PJ com portal de acesso, controle de vigência contratual e gestão de repasses financeiros.
- **Público-Alvo:** Empresas com 5-100+ prestadores PJ (clínicas, consultorias, agências).
- **Projeto:** AXIS AXHUB
- **Supabase Project Ref:** `dgybxarkvmaajfeesqdv`
- **Repo:** `rodcariaodonto-afk/axis-axhub`

## 2. Escopo da Fase 1

| # | Sub-módulo | Descrição |
|---|---|---|
| 1 | Portal do Prestador | Dashboard self-service para PJs visualizarem contratos, repasses, documentos e notificações |
| 2 | Controle de Vigência | Alertas de vencimento + dashboard de vigência (reutiliza `start_date`/`end_date`/`auto_renew` existentes) |
| 3 | Repasses Básicos | Criação de repasses vinculados a PJ via `payables` + histórico + status |

**Fora do escopo:** Workflow de aprovação de NF, gestão documental avançada, cálculo de impostos/retenções, repasses automáticos recorrentes.

---

## 3. Análise do Schema Existente (verificado via GitHub em 21/06/2026)

### 3.1 crm_accounts (15 colunas)
```
id, tenant_id, name, email, phone, cnpj, segment, 
instagram, website, address_json, responsible_json,
owner_user_id, is_active, created_at, updated_at
```
**Não existe campo `account_type`.** O campo `segment` é texto livre.  
**Decisão:** Adicionar `account_type` (text, default 'client') para diferenciar PJs (`pj_provider`) de clientes.

### 3.2 contracts (32 colunas) — campos de vigência JÁ EXISTEM
```
start_date, end_date, auto_renew, renewal_date, account_id (FK crm_accounts)
```
**Não precisa criar `vigencia_inicio`/`vigencia_fim`/`renovacao_automatica`** — reutilizar `start_date`, `end_date`, `auto_renew`.  
**Falta:** `alert_days_before_expiry` (integer, default 30).

### 3.3 payables (17 colunas)
```
id, tenant_id, description, amount, due_date, status, paid_at,
supplier_id, category_id, bank_account_id, payment_method,
accounting_type, accounting_group, po_id, recurrence_id,
is_recurring_template, created_at
```
**Não tem `pj_id`.** Tem `supplier_id` mas suppliers e PJs são entidades diferentes no AXIS.  
**Falta:** `pj_id`, `repasse_type`, `repasse_status`.

---

## 4. Requisitos Funcionais

### 4.1 Portal do Prestador

#### RF-P01: Autenticação de PJ
- Super Admin cria acesso para PJ via email (mesmo fluxo de criação de tenant — envia email, PJ cria conta e recebe magic link).
- Acesso vinculado a `pj_portal_access` (PJ ↔ tenant ↔ user).
- PJ pode ter acesso a múltiplos tenants.
- `access_level`: view (default), edit, full.

#### RF-P02: Layout do Portal PJ
- Layout 100% separado do admin (melhor UX para produto vendável).
- Rota base: `/portal` com sub-rotas: `/portal/dashboard`, `/portal/contratos`, `/portal/repasses`, `/portal/documentos`, `/portal/notificacoes`.
- Sidebar simplificada: Dashboard, Contratos, Repasses, Documentos, Notificações, Perfil.
- Sem acesso a módulos internos (CRM, ERP, Financeiro, etc).

#### RF-P03: Dashboard do PJ
- Widgets resumo:
  - Contratos ativos (count + próximo vencimento)
  - Último repasse recebido (valor + data)
  - Documentos pendentes (count)
  - Notificações não lidas (count)
- Filtrado por `tenant_id` + `pj_id`.

#### RF-P04: Listagem de Contratos
- Exibir contratos onde `contracts.account_id = pj.crm_account_id`.
- Colunas: nome, status, start_date/end_date, valor, auto_renew.
- Somente leitura para PJ.

#### RF-P05: Histórico de Repasses
- Exibir payables onde `payables.pj_id = pj.crm_account_id`.
- Colunas: data, valor, status_repasse, comprovante (link download).
- Filtros: período, status.

#### RF-P06: Upload de Documentos (básico)
- Upload de docs solicitados pela empresa.
- Supabase Storage, bucket `pj-documents`, path: `{tenant_id}/{pj_id}/{doc_type}/{filename}`.
- Aceita: PDF, JPG, PNG. Max: 10MB.

#### RF-P07: Notificações
- Tipos: contrato_vencendo, repasse_realizado, documento_solicitado, contrato_renovado.
- Indicador de não lida. Marcar como lida individual ou em massa.

### 4.2 Controle de Vigência

#### RF-V01: Campo de Alerta
- Adicionar `alert_days_before_expiry` (integer, default 30) em `contracts`.
- Reutilizar `start_date`, `end_date`, `auto_renew` existentes.

#### RF-V02: Dashboard de Vigência
- Página interna (admin/finance): contratos por status de vigência.
  - Vencidos (vermelho): end_date < hoje
  - Vencendo em 30 dias (amarelo): end_date entre hoje e hoje+30
  - Vigentes (verde): end_date > hoje+30
  - Sem vigência (cinza): end_date IS NULL
- Filtros: PJ, status.

#### RF-V03: Alertas de Vencimento
- Edge function `check-contract-expiry` (cron diário via Supabase cron ou invocação manual).
- Gera `pj_notifications` quando contrato está a X dias do vencimento.
- Alertas em 30, 15, 7 dias.
- Notifica admin do tenant + PJ (se tiver portal access).

#### RF-V04: Renovação de Contratos
- Quando `auto_renew = true` e `end_date` é atingido:
  - Criar `contract_renewals` com status `pendente`.
  - Admin aprova → sistema cria novo contrato (cópia) com datas atualizadas.
  - Status: pendente → aprovada → executada (ou rejeitada).

### 4.3 Repasses Básicos

#### RF-R01: Vinculação PJ ↔ Payable
- Adicionar em `payables`: `pj_id` (FK → crm_accounts, nullable), `repasse_type` (text), `repasse_status` (text, default 'pendente').

#### RF-R02: Criação de Repasse
- Admin/finance cria repasse: seleciona PJ (crm_accounts com account_type='pj_provider'), valor, data, descrição, contrato vinculado (opcional).
- Salva em `payables` com `pj_id` + cria `pj_repasse_history`.

#### RF-R03: Histórico de Repasses (admin)
- Página interna com todos os repasses por PJ.
- Status: pendente → aprovado → pago → cancelado.
- Upload de comprovante (PDF).

---

## 5. Regras de Negócio

### RN-01: Isolamento Multi-tenant
- Todas queries filtram por `tenant_id`. RLS obrigatório em todas as novas tabelas.

### RN-02: Identificação de PJ
- `crm_accounts.account_type = 'pj_provider'` identifica PJs.
- Default da nova coluna: 'client' (backward compatible).

### RN-03: Roles
- Portal PJ: novo role `pj_viewer` com acesso restrito.
- Gestão de vigência/repasses: admin, finance, operations.
- PJ nunca edita contratos, nunca aprova repasses.

### RN-04: Backward Compatibility
- Todas novas colunas em tabelas existentes são nullable ou com default.
- Contratos sem end_date continuam funcionando.
- Payables sem pj_id continuam funcionando.

### RN-05: Audit Trail
- Ações críticas geram entrada no audit_logs existente.

---

## 6. Modelo de Dados

### 6.1 ALTER em tabelas existentes

```sql
-- crm_accounts: adicionar tipo de conta
ALTER TABLE public.crm_accounts 
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'client';

CREATE INDEX IF NOT EXISTS idx_crm_accounts_type 
  ON public.crm_accounts(tenant_id, account_type);

-- contracts: adicionar dias de alerta
ALTER TABLE public.contracts 
  ADD COLUMN IF NOT EXISTS alert_days_before_expiry integer DEFAULT 30;

-- payables: adicionar vínculo PJ
ALTER TABLE public.payables 
  ADD COLUMN IF NOT EXISTS pj_id uuid REFERENCES public.crm_accounts(id) ON DELETE SET NULL;
ALTER TABLE public.payables 
  ADD COLUMN IF NOT EXISTS repasse_type text;
ALTER TABLE public.payables 
  ADD COLUMN IF NOT EXISTS repasse_status text DEFAULT 'pendente';

CREATE INDEX IF NOT EXISTS idx_payables_pj 
  ON public.payables(tenant_id, pj_id) WHERE pj_id IS NOT NULL;
```

### 6.2 Novas tabelas

```sql
-- Portal access: vincula PJ ↔ tenant ↔ auth.user
CREATE TABLE IF NOT EXISTS public.pj_portal_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  pj_id uuid NOT NULL REFERENCES public.crm_accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_level text NOT NULL DEFAULT 'view',
  last_login timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, pj_id, user_id)
);

-- Notificações PJ
CREATE TABLE IF NOT EXISTS public.pj_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  pj_id uuid NOT NULL REFERENCES public.crm_accounts(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text,
  related_id uuid,
  related_type text,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Renovações de contrato
CREATE TABLE IF NOT EXISTS public.contract_renewals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  original_end_date date NOT NULL,
  new_start_date date NOT NULL,
  new_end_date date NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  new_contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Histórico de repasses
CREATE TABLE IF NOT EXISTS public.pj_repasse_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  pj_id uuid NOT NULL REFERENCES public.crm_accounts(id) ON DELETE CASCADE,
  payable_id uuid REFERENCES public.payables(id) ON DELETE SET NULL,
  contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  valor numeric NOT NULL CHECK (valor > 0),
  data_repasse date NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  comprovante_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pj_portal_access_user ON public.pj_portal_access(user_id);
CREATE INDEX IF NOT EXISTS idx_pj_portal_access_pj ON public.pj_portal_access(tenant_id, pj_id);
CREATE INDEX IF NOT EXISTS idx_pj_notifications_pj ON public.pj_notifications(tenant_id, pj_id, is_read);
CREATE INDEX IF NOT EXISTS idx_contract_renewals_contract ON public.contract_renewals(contract_id);
CREATE INDEX IF NOT EXISTS idx_pj_repasse_history_pj ON public.pj_repasse_history(tenant_id, pj_id);

-- RLS
ALTER TABLE public.pj_portal_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pj_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_renewals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pj_repasse_history ENABLE ROW LEVEL SECURITY;

-- Triggers updated_at
CREATE TRIGGER set_updated_at_pj_portal_access BEFORE UPDATE ON public.pj_portal_access
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_contract_renewals BEFORE UPDATE ON public.contract_renewals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 6.3 RLS Policies

```sql
-- pj_portal_access: admin do tenant pode tudo; PJ vê apenas seu próprio acesso
CREATE POLICY "tenant_admin_pj_portal_access" ON public.pj_portal_access
  USING (tenant_id = get_user_tenant_id());
CREATE POLICY "pj_own_access" ON public.pj_portal_access
  FOR SELECT USING (user_id = auth.uid());

-- pj_notifications: admin vê todas do tenant; PJ vê apenas suas
CREATE POLICY "tenant_admin_pj_notifications" ON public.pj_notifications
  USING (tenant_id = get_user_tenant_id());
CREATE POLICY "pj_own_notifications" ON public.pj_notifications
  FOR SELECT USING (pj_id IN (
    SELECT pa.pj_id FROM public.pj_portal_access pa WHERE pa.user_id = auth.uid()
  ));
CREATE POLICY "pj_update_own_notifications" ON public.pj_notifications
  FOR UPDATE USING (pj_id IN (
    SELECT pa.pj_id FROM public.pj_portal_access pa WHERE pa.user_id = auth.uid()
  ));

-- contract_renewals: tenant isolation
CREATE POLICY "tenant_isolation_contract_renewals" ON public.contract_renewals
  USING (tenant_id = get_user_tenant_id());
CREATE POLICY "tenant_insert_contract_renewals" ON public.contract_renewals
  FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());

-- pj_repasse_history: tenant isolation + PJ vê seus repasses
CREATE POLICY "tenant_isolation_pj_repasse_history" ON public.pj_repasse_history
  USING (tenant_id = get_user_tenant_id());
CREATE POLICY "pj_own_repasses" ON public.pj_repasse_history
  FOR SELECT USING (pj_id IN (
    SELECT pa.pj_id FROM public.pj_portal_access pa WHERE pa.user_id = auth.uid()
  ));
```

---

## 7. Integrações

### 7.1 Supabase Storage
- Bucket novo: `pj-documents`
- Policy: PJ upload/download dos próprios docs; admin do tenant vê todos.

### 7.2 Edge Functions
- `check-contract-expiry` — cron diário
- `send-pj-notification` — chamada por triggers/cron

### 7.3 Frontend
- Portal PJ: layout separado em `/portal/*`
- Admin: `/contracts/vigency`, `/repasses`
- Componentes em `src/components/pj-portal/`, `src/components/contract-vigency/`, `src/components/repasses/`

---

## 8. Critérios de Aceite (BDD)

- **Dado que** um PJ tem `pj_portal_access` ativo, **quando** faz login, **então** vê dashboard com widgets filtrados por tenant+pj.
- **Dado que** um PJ está logado no portal, **quando** acessa contratos, **então** vê apenas seus contratos (via `account_id`) no tenant atual.
- **Dado que** um contrato tem `end_date` definido, **quando** faltam 30 dias, **então** o cron gera notificação para admin e PJ.
- **Dado que** admin cria repasse para PJ, **quando** salva, **então** cria payable com `pj_id` + registro em `pj_repasse_history`.
- **Dado que** um PJ acessa repasses no portal, **quando** um repasse está pago, **então** vê valor, data e link do comprovante.
- **Dado que** admin tenta criar repasse com valor ≤ 0, **quando** submete, **então** recebe erro de validação.
- **Dado que** um contrato tem `auto_renew = true` e atinge `end_date`, **quando** cron roda, **então** cria `contract_renewal` com status `pendente`.

---

## 9. Casos Extremos

| Cenário | Ação |
|---|---|
| PJ sem `pj_portal_access` tenta acessar portal | Tela "acesso não autorizado" |
| PJ vinculado a múltiplos tenants | Seletor de tenant no login |
| Contrato com `auto_renew=true` mas sem `end_date` | Ignorar renovação, log warning |
| Upload > 10MB ou tipo inválido | Rejeitar no frontend |
| Repasse com valor ≤ 0 | Check constraint no banco + validação Zod |
| crm_accounts sem account_type preenchido | Default 'client', não aparece como PJ |

---

## 10. Riscos

| Risco | Mitigação |
|---|---|
| Lovable reescrever edge functions | Verificar line count pós-deploy |
| RLS mal configurada expondo dados entre tenants | Testes de isolamento antes de merge |
| RLS dupla (admin + PJ) causar conflito | Testar com ambos perfis |
| Conflito com WhatsApp Meta feature branch | Branches separadas, merge sequencial |
