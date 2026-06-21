-- ============================================================
-- PJ Management — Fase 1 (MVP)
-- Slice 1: Schema — ALTERs, CREATE TABLEs, indexes, RLS, triggers
-- ============================================================

-- ============================================================
-- SECTION 1: ALTER existing tables (backward compatible)
-- ============================================================

-- crm_accounts: tipo de conta (default 'client' garante backward compat)
ALTER TABLE public.crm_accounts
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'client';

CREATE INDEX IF NOT EXISTS idx_crm_accounts_type
  ON public.crm_accounts(tenant_id, account_type);

-- contracts: dias de alerta antes do vencimento
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS alert_days_before_expiry integer DEFAULT 30;

-- payables: vínculo com PJ (nullable = backward compat)
ALTER TABLE public.payables
  ADD COLUMN IF NOT EXISTS pj_id uuid REFERENCES public.crm_accounts(id) ON DELETE SET NULL;

ALTER TABLE public.payables
  ADD COLUMN IF NOT EXISTS repasse_type text;

ALTER TABLE public.payables
  ADD COLUMN IF NOT EXISTS repasse_status text DEFAULT 'pendente';

CREATE INDEX IF NOT EXISTS idx_payables_pj
  ON public.payables(tenant_id, pj_id) WHERE pj_id IS NOT NULL;

-- ============================================================
-- SECTION 2: CREATE new tables
-- ============================================================

-- pj_portal_access: vincula PJ ↔ tenant ↔ auth.user
CREATE TABLE IF NOT EXISTS public.pj_portal_access (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  pj_id         uuid        NOT NULL REFERENCES public.crm_accounts(id) ON DELETE CASCADE,
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_level  text        NOT NULL DEFAULT 'view',
  last_login    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, pj_id, user_id)
);

-- pj_notifications: notificações enviadas ao PJ
CREATE TABLE IF NOT EXISTS public.pj_notifications (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  pj_id         uuid        NOT NULL REFERENCES public.crm_accounts(id) ON DELETE CASCADE,
  type          text        NOT NULL,
  title         text        NOT NULL,
  message       text,
  related_id    uuid,
  related_type  text,
  is_read       boolean     NOT NULL DEFAULT false,
  read_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- contract_renewals: renovações de contratos com auto_renew
CREATE TABLE IF NOT EXISTS public.contract_renewals (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contract_id       uuid        NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  original_end_date date        NOT NULL,
  new_start_date    date        NOT NULL,
  new_end_date      date        NOT NULL,
  status            text        NOT NULL DEFAULT 'pendente',
  approved_by       uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at       timestamptz,
  new_contract_id   uuid        REFERENCES public.contracts(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- pj_repasse_history: histórico de repasses financeiros ao PJ
CREATE TABLE IF NOT EXISTS public.pj_repasse_history (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  pj_id           uuid        NOT NULL REFERENCES public.crm_accounts(id) ON DELETE CASCADE,
  payable_id      uuid        REFERENCES public.payables(id) ON DELETE SET NULL,
  contract_id     uuid        REFERENCES public.contracts(id) ON DELETE SET NULL,
  valor           numeric     NOT NULL CHECK (valor > 0),
  data_repasse    date        NOT NULL,
  status          text        NOT NULL DEFAULT 'pendente',
  comprovante_url text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- SECTION 3: Indexes for new tables
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_pj_portal_access_user
  ON public.pj_portal_access(user_id);

CREATE INDEX IF NOT EXISTS idx_pj_portal_access_pj
  ON public.pj_portal_access(tenant_id, pj_id);

CREATE INDEX IF NOT EXISTS idx_pj_notifications_pj
  ON public.pj_notifications(tenant_id, pj_id, is_read);

CREATE INDEX IF NOT EXISTS idx_contract_renewals_contract
  ON public.contract_renewals(contract_id);

CREATE INDEX IF NOT EXISTS idx_pj_repasse_history_pj
  ON public.pj_repasse_history(tenant_id, pj_id);

-- ============================================================
-- SECTION 4: Enable RLS on new tables
-- ============================================================

ALTER TABLE public.pj_portal_access    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pj_notifications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_renewals   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pj_repasse_history  ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SECTION 5: Triggers updated_at (usa função já existente)
-- ============================================================

CREATE TRIGGER set_updated_at_pj_portal_access
  BEFORE UPDATE ON public.pj_portal_access
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_contract_renewals
  BEFORE UPDATE ON public.contract_renewals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SECTION 6: RLS Policies
-- ============================================================

-- --- pj_portal_access ---
-- Admin do tenant gerencia todos os acessos do tenant
CREATE POLICY "tenant_admin_pj_portal_access" ON public.pj_portal_access
  USING (tenant_id = get_user_tenant_id());

-- PJ visualiza apenas seu próprio registro de acesso
CREATE POLICY "pj_own_access" ON public.pj_portal_access
  FOR SELECT
  USING (user_id = auth.uid());

-- --- pj_notifications ---
-- Admin do tenant vê todas as notificações do tenant
CREATE POLICY "tenant_admin_pj_notifications" ON public.pj_notifications
  USING (tenant_id = get_user_tenant_id());

-- PJ visualiza apenas suas próprias notificações
CREATE POLICY "pj_own_notifications" ON public.pj_notifications
  FOR SELECT
  USING (pj_id IN (
    SELECT pa.pj_id FROM public.pj_portal_access pa WHERE pa.user_id = auth.uid()
  ));

-- PJ pode marcar suas próprias notificações como lidas
CREATE POLICY "pj_update_own_notifications" ON public.pj_notifications
  FOR UPDATE
  USING (pj_id IN (
    SELECT pa.pj_id FROM public.pj_portal_access pa WHERE pa.user_id = auth.uid()
  ));

-- --- contract_renewals ---
-- Tenant isolation: admin/finance vê e edita renovações do próprio tenant
CREATE POLICY "tenant_isolation_contract_renewals" ON public.contract_renewals
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_insert_contract_renewals" ON public.contract_renewals
  FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id());

-- --- pj_repasse_history ---
-- Tenant isolation: admin/finance vê todos os repasses do tenant
CREATE POLICY "tenant_isolation_pj_repasse_history" ON public.pj_repasse_history
  USING (tenant_id = get_user_tenant_id());

-- PJ visualiza apenas seus próprios repasses
CREATE POLICY "pj_own_repasses" ON public.pj_repasse_history
  FOR SELECT
  USING (pj_id IN (
    SELECT pa.pj_id FROM public.pj_portal_access pa WHERE pa.user_id = auth.uid()
  ));
