-- ============================================================
-- PJ Management — Fase 3 (Otimização)
-- Slice 15: Schema migration
-- ============================================================

-- ============================================================
-- SECTION 1: ALTERs em tabelas existentes
-- ============================================================

-- api_keys: adicionar scopes, rate limit, controle de acesso
ALTER TABLE public.api_keys
  ADD COLUMN IF NOT EXISTS scopes        text[]      DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS rate_limit    integer     DEFAULT 60,
  ADD COLUMN IF NOT EXISTS is_active     boolean     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_used_at  timestamptz,
  ADD COLUMN IF NOT EXISTS expires_at    timestamptz;

-- bank_accounts: adicionar dados de conta PJ e PIX
ALTER TABLE public.bank_accounts
  ADD COLUMN IF NOT EXISTS agency        text,
  ADD COLUMN IF NOT EXISTS account_type  text        DEFAULT 'corrente',
  ADD COLUMN IF NOT EXISTS pix_key       text,
  ADD COLUMN IF NOT EXISTS pix_key_type  text,
  ADD COLUMN IF NOT EXISTS cnpj_titular  text,
  ADD COLUMN IF NOT EXISTS pj_id         uuid        REFERENCES public.crm_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bank_accounts_pj
  ON public.bank_accounts(tenant_id, pj_id) WHERE pj_id IS NOT NULL;

-- nf_approvals: adicionar validação SEFAZ
ALTER TABLE public.nf_approvals
  ADD COLUMN IF NOT EXISTS chave_nfe          text,
  ADD COLUMN IF NOT EXISTS sefaz_validation   jsonb,
  ADD COLUMN IF NOT EXISTS sefaz_status       text    DEFAULT 'nao_verificado';

-- nf_workflow_config: toggle de validação SEFAZ por tenant
ALTER TABLE public.nf_workflow_config
  ADD COLUMN IF NOT EXISTS sefaz_validation_enabled boolean DEFAULT false;

-- pj_repasse_history: campos PIX e conciliação bancária
ALTER TABLE public.pj_repasse_history
  ADD COLUMN IF NOT EXISTS pix_payload          text,
  ADD COLUMN IF NOT EXISTS pix_qrcode_url       text,
  ADD COLUMN IF NOT EXISTS transaction_id       text,
  ADD COLUMN IF NOT EXISTS paid_date            date,
  ADD COLUMN IF NOT EXISTS paid_amount          numeric,
  ADD COLUMN IF NOT EXISTS conciliation_status  text    DEFAULT 'pendente';

-- ============================================================
-- SECTION 2: Novas tabelas — Módulo C (Avaliação de PJ)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pj_evaluation_criteria (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  description text,
  weight      integer     NOT NULL DEFAULT 5 CHECK (weight BETWEEN 1 AND 10),
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pj_evaluations (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  pj_id         uuid        NOT NULL REFERENCES public.crm_accounts(id) ON DELETE CASCADE,
  evaluator_id  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start  date        NOT NULL,
  period_end    date        NOT NULL,
  overall_score numeric     NOT NULL DEFAULT 0,
  comment       text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pj_evaluation_scores (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id  uuid        NOT NULL REFERENCES public.pj_evaluations(id) ON DELETE CASCADE,
  criteria_id    uuid        NOT NULL REFERENCES public.pj_evaluation_criteria(id) ON DELETE CASCADE,
  score          integer     NOT NULL CHECK (score BETWEEN 1 AND 5),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pj_composite_scores (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  pj_id               uuid        NOT NULL REFERENCES public.crm_accounts(id) ON DELETE CASCADE,
  evaluation_score    numeric     NOT NULL DEFAULT 0,
  compliance_score    numeric     NOT NULL DEFAULT 0,
  punctuality_score   numeric     NOT NULL DEFAULT 0,
  rejection_penalty   numeric     NOT NULL DEFAULT 0,
  final_score         numeric     NOT NULL DEFAULT 0,
  calculated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, pj_id)
);

-- ============================================================
-- SECTION 3: Novas tabelas — Módulo D (API Pública)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.api_request_logs (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  api_key_id       uuid        NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  method           text        NOT NULL,
  path             text        NOT NULL,
  status_code      integer     NOT NULL,
  response_time_ms integer,
  ip_address       text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.webhook_delivery_logs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  webhook_id      uuid        NOT NULL REFERENCES public.integration_webhooks(id) ON DELETE CASCADE,
  event           text        NOT NULL,
  payload         jsonb       NOT NULL,
  response_status integer,
  response_body   text,
  attempt         integer     NOT NULL DEFAULT 1,
  delivered_at    timestamptz,
  next_retry_at   timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- SECTION 4: Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_pj_evaluation_criteria_tenant
  ON public.pj_evaluation_criteria(tenant_id);

CREATE INDEX IF NOT EXISTS idx_pj_evaluations_pj
  ON public.pj_evaluations(tenant_id, pj_id);

CREATE INDEX IF NOT EXISTS idx_pj_evaluation_scores_eval
  ON public.pj_evaluation_scores(evaluation_id);

CREATE INDEX IF NOT EXISTS idx_pj_composite_scores_tenant
  ON public.pj_composite_scores(tenant_id, final_score DESC);

CREATE INDEX IF NOT EXISTS idx_api_request_logs_key
  ON public.api_request_logs(api_key_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_delivery_logs_webhook
  ON public.webhook_delivery_logs(webhook_id, created_at DESC);

-- ============================================================
-- SECTION 5: Enable RLS
-- ============================================================

ALTER TABLE public.pj_evaluation_criteria  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pj_evaluations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pj_evaluation_scores    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pj_composite_scores     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_request_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_delivery_logs   ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SECTION 6: RLS Policies
-- ============================================================

-- ─── pj_evaluation_criteria ──────────────────────────────────
CREATE POLICY "tenant_isolation_pj_evaluation_criteria" ON public.pj_evaluation_criteria
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_insert_pj_evaluation_criteria" ON public.pj_evaluation_criteria
  FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id());

-- ─── pj_evaluations ──────────────────────────────────────────
-- Admin do tenant: acesso total
CREATE POLICY "tenant_isolation_pj_evaluations" ON public.pj_evaluations
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_insert_pj_evaluations" ON public.pj_evaluations
  FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id());

-- PJ pode ver suas próprias avaliações no portal (somente leitura)
CREATE POLICY "pj_select_own_evaluations" ON public.pj_evaluations
  FOR SELECT
  USING (pj_id IN (
    SELECT pa.pj_id FROM public.pj_portal_access pa WHERE pa.user_id = auth.uid()
  ));

-- ─── pj_evaluation_scores ────────────────────────────────────
-- Acesso via pj_evaluations do tenant (admin)
CREATE POLICY "tenant_isolation_pj_evaluation_scores" ON public.pj_evaluation_scores
  USING (evaluation_id IN (
    SELECT e.id FROM public.pj_evaluations e WHERE e.tenant_id = get_user_tenant_id()
  ));

CREATE POLICY "tenant_insert_pj_evaluation_scores" ON public.pj_evaluation_scores
  FOR INSERT
  WITH CHECK (evaluation_id IN (
    SELECT e.id FROM public.pj_evaluations e WHERE e.tenant_id = get_user_tenant_id()
  ));

-- PJ pode ver scores de suas próprias avaliações
CREATE POLICY "pj_select_own_evaluation_scores" ON public.pj_evaluation_scores
  FOR SELECT
  USING (evaluation_id IN (
    SELECT e.id FROM public.pj_evaluations e
    WHERE e.pj_id IN (
      SELECT pa.pj_id FROM public.pj_portal_access pa WHERE pa.user_id = auth.uid()
    )
  ));

-- ─── pj_composite_scores ─────────────────────────────────────
-- Admin do tenant: acesso total
CREATE POLICY "tenant_isolation_pj_composite_scores" ON public.pj_composite_scores
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_insert_pj_composite_scores" ON public.pj_composite_scores
  FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id());

-- PJ pode ver seu próprio score composto no portal (somente leitura)
CREATE POLICY "pj_select_own_composite_score" ON public.pj_composite_scores
  FOR SELECT
  USING (pj_id IN (
    SELECT pa.pj_id FROM public.pj_portal_access pa WHERE pa.user_id = auth.uid()
  ));

-- ─── api_request_logs ────────────────────────────────────────
-- Somente admin do tenant lê e insere logs (sem acesso portal PJ)
CREATE POLICY "tenant_isolation_api_request_logs" ON public.api_request_logs
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_insert_api_request_logs" ON public.api_request_logs
  FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id());

-- ─── webhook_delivery_logs ───────────────────────────────────
-- Somente admin do tenant lê e insere logs (sem acesso portal PJ)
CREATE POLICY "tenant_isolation_webhook_delivery_logs" ON public.webhook_delivery_logs
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_insert_webhook_delivery_logs" ON public.webhook_delivery_logs
  FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id());

-- ============================================================
-- SECTION 7: Triggers updated_at
-- ============================================================

CREATE TRIGGER set_updated_at_pj_evaluation_criteria
  BEFORE UPDATE ON public.pj_evaluation_criteria
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_pj_evaluations
  BEFORE UPDATE ON public.pj_evaluations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
