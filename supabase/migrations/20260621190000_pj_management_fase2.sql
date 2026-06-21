-- ============================================================
-- PJ Management — Fase 2 (Consolidação)
-- Slice 7: Schema — 9 CREATE TABLEs, ALTERs, indexes, RLS, triggers
-- ============================================================

-- ============================================================
-- SECTION 1: CREATE new tables — Módulo A: Workflow NF
-- ============================================================

-- NFs recebidas do PJ (inbound) — NÃO confundir com fiscal_invoices (outbound)
CREATE TABLE IF NOT EXISTS public.nf_approvals (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  pj_id            uuid        NOT NULL REFERENCES public.crm_accounts(id) ON DELETE CASCADE,
  nf_number        text        NOT NULL,
  nf_series        text,
  nf_value         numeric     NOT NULL CHECK (nf_value > 0),
  nf_date          date        NOT NULL,
  nf_due_date      date,
  cnpj_emitente    text,
  xml_url          text,
  pdf_url          text,
  status           text        NOT NULL DEFAULT 'pendente',
  validation_errors jsonb,
  payable_id       uuid        REFERENCES public.payables(id) ON DELETE SET NULL,
  created_by       uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Steps individuais do workflow de aprovação
CREATE TABLE IF NOT EXISTS public.nf_approval_steps (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nf_approval_id  uuid        NOT NULL REFERENCES public.nf_approvals(id) ON DELETE CASCADE,
  step_number     integer     NOT NULL,
  approver_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status          text        NOT NULL DEFAULT 'pendente',
  comment         text,
  acted_at        timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Configuração de workflow por tenant (1-3 níveis de aprovação)
CREATE TABLE IF NOT EXISTS public.nf_workflow_config (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  approval_levels       integer     NOT NULL DEFAULT 1 CHECK (approval_levels BETWEEN 1 AND 3),
  level1_approver_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  level2_approver_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  level3_approver_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  auto_create_payable   boolean     NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

-- ============================================================
-- SECTION 2: CREATE new tables — Módulo B: Gestão Documental
-- ============================================================

-- Tipos de documento configuráveis por tenant
CREATE TABLE IF NOT EXISTS public.pj_document_types (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name          text        NOT NULL,
  description   text,
  is_mandatory  boolean     NOT NULL DEFAULT false,
  validity_days integer,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Documento atual do PJ (versão mais recente)
CREATE TABLE IF NOT EXISTS public.pj_documents (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  pj_id               uuid        NOT NULL REFERENCES public.crm_accounts(id) ON DELETE CASCADE,
  document_type_id    uuid        NOT NULL REFERENCES public.pj_document_types(id) ON DELETE CASCADE,
  document_number     text,
  issue_date          date,
  expiry_date         date,
  file_url            text        NOT NULL,
  validation_status   text        NOT NULL DEFAULT 'pendente',
  current_version     integer     NOT NULL DEFAULT 1,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Histórico de versões de cada documento
CREATE TABLE IF NOT EXISTS public.pj_document_versions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  pj_document_id   uuid        NOT NULL REFERENCES public.pj_documents(id) ON DELETE CASCADE,
  version_number   integer     NOT NULL,
  file_url         text        NOT NULL,
  uploaded_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- SECTION 3: CREATE new tables — Módulo C: Impostos e Retenções
-- ============================================================

-- Alíquotas por PJ (configuradas pelo admin)
CREATE TABLE IF NOT EXISTS public.pj_tax_settings (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  pj_id               uuid        NOT NULL REFERENCES public.crm_accounts(id) ON DELETE CASCADE,
  regime_tributario   text        NOT NULL DEFAULT 'simples_nacional',
  aliquota_ir         numeric     NOT NULL DEFAULT 0,
  aliquota_pis        numeric     NOT NULL DEFAULT 0,
  aliquota_cofins     numeric     NOT NULL DEFAULT 0,
  aliquota_inss       numeric     NOT NULL DEFAULT 0,
  aliquota_iss        numeric     NOT NULL DEFAULT 0,
  aliquota_csll       numeric     NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, pj_id)
);

-- Breakdown de retenções calculadas por NF/repasse
CREATE TABLE IF NOT EXISTS public.pj_tax_retentions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  pj_id           uuid        NOT NULL REFERENCES public.crm_accounts(id) ON DELETE CASCADE,
  nf_approval_id  uuid        REFERENCES public.nf_approvals(id) ON DELETE SET NULL,
  payable_id      uuid        REFERENCES public.payables(id) ON DELETE SET NULL,
  valor_bruto     numeric     NOT NULL CHECK (valor_bruto > 0),
  ir_value        numeric     NOT NULL DEFAULT 0,
  pis_value       numeric     NOT NULL DEFAULT 0,
  cofins_value    numeric     NOT NULL DEFAULT 0,
  inss_value      numeric     NOT NULL DEFAULT 0,
  iss_value       numeric     NOT NULL DEFAULT 0,
  csll_value      numeric     NOT NULL DEFAULT 0,
  total_retention numeric     NOT NULL DEFAULT 0,
  valor_liquido   numeric     NOT NULL,
  rpa_url         text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- SECTION 4: CREATE new tables — Módulo D: Repasses Automáticos
-- ============================================================

-- Agendamentos de repasse recorrente
CREATE TABLE IF NOT EXISTS public.pj_repasse_schedules (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  pj_id            uuid        NOT NULL REFERENCES public.crm_accounts(id) ON DELETE CASCADE,
  valor            numeric     NOT NULL CHECK (valor > 0),
  tipo_valor       text        NOT NULL DEFAULT 'fixo',
  recorrente       boolean     NOT NULL DEFAULT false,
  frequencia       text,
  dia_execucao     integer,
  proxima_data     date        NOT NULL,
  bank_account_id  uuid        REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  status           text        NOT NULL DEFAULT 'ativo',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- SECTION 5: ALTER pj_repasse_history (backward compatible — nullable)
-- ============================================================

ALTER TABLE public.pj_repasse_history
  ADD COLUMN IF NOT EXISTS nf_approval_id uuid REFERENCES public.nf_approvals(id) ON DELETE SET NULL;

ALTER TABLE public.pj_repasse_history
  ADD COLUMN IF NOT EXISTS bank_transfer_id uuid REFERENCES public.bank_transfers(id) ON DELETE SET NULL;

-- schedule_id pode só ser adicionado após pj_repasse_schedules existir (garantido acima)
ALTER TABLE public.pj_repasse_history
  ADD COLUMN IF NOT EXISTS schedule_id uuid REFERENCES public.pj_repasse_schedules(id) ON DELETE SET NULL;

ALTER TABLE public.pj_repasse_history
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;

ALTER TABLE public.pj_repasse_history
  ADD COLUMN IF NOT EXISTS confirmed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- ============================================================
-- SECTION 6: Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_nf_approvals_pj
  ON public.nf_approvals(tenant_id, pj_id, status);

CREATE INDEX IF NOT EXISTS idx_nf_approval_steps_nf
  ON public.nf_approval_steps(nf_approval_id, step_number);

CREATE INDEX IF NOT EXISTS idx_pj_document_types_tenant
  ON public.pj_document_types(tenant_id);

CREATE INDEX IF NOT EXISTS idx_pj_documents_pj
  ON public.pj_documents(tenant_id, pj_id, document_type_id);

CREATE INDEX IF NOT EXISTS idx_pj_documents_expiry
  ON public.pj_documents(expiry_date) WHERE expiry_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pj_document_versions_doc
  ON public.pj_document_versions(pj_document_id);

CREATE INDEX IF NOT EXISTS idx_pj_tax_settings_pj
  ON public.pj_tax_settings(tenant_id, pj_id);

CREATE INDEX IF NOT EXISTS idx_pj_tax_retentions_pj
  ON public.pj_tax_retentions(tenant_id, pj_id);

CREATE INDEX IF NOT EXISTS idx_pj_repasse_schedules_next
  ON public.pj_repasse_schedules(proxima_data, status) WHERE status = 'ativo';

-- ============================================================
-- SECTION 7: Enable RLS em todas as 9 novas tabelas
-- ============================================================

ALTER TABLE public.nf_approvals          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nf_approval_steps     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nf_workflow_config    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pj_document_types     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pj_documents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pj_document_versions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pj_tax_settings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pj_tax_retentions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pj_repasse_schedules  ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SECTION 8: Triggers updated_at
-- ============================================================

CREATE TRIGGER set_updated_at_nf_approvals
  BEFORE UPDATE ON public.nf_approvals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_nf_approval_steps
  BEFORE UPDATE ON public.nf_approval_steps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_nf_workflow_config
  BEFORE UPDATE ON public.nf_workflow_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_pj_documents
  BEFORE UPDATE ON public.pj_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_pj_tax_settings
  BEFORE UPDATE ON public.pj_tax_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_pj_repasse_schedules
  BEFORE UPDATE ON public.pj_repasse_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SECTION 9: RLS Policies
-- ============================================================

-- ─── nf_approvals ────────────────────────────────────────────
-- Admin do tenant: acesso total às NFs do tenant
CREATE POLICY "tenant_isolation_nf_approvals" ON public.nf_approvals
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_insert_nf_approvals" ON public.nf_approvals
  FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id());

-- PJ pode ver suas próprias NFs no portal
CREATE POLICY "pj_select_own_nf_approvals" ON public.nf_approvals
  FOR SELECT
  USING (pj_id IN (
    SELECT pa.pj_id FROM public.pj_portal_access pa WHERE pa.user_id = auth.uid()
  ));

-- PJ pode submeter NF pelo portal
CREATE POLICY "pj_insert_nf_approvals" ON public.nf_approvals
  FOR INSERT
  WITH CHECK (pj_id IN (
    SELECT pa.pj_id FROM public.pj_portal_access pa WHERE pa.user_id = auth.uid()
  ));

-- ─── nf_approval_steps ───────────────────────────────────────
-- Somente admin do tenant vê e edita steps (PJ não vê quem aprovou)
CREATE POLICY "tenant_isolation_nf_approval_steps" ON public.nf_approval_steps
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_insert_nf_approval_steps" ON public.nf_approval_steps
  FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id());

-- ─── nf_workflow_config ──────────────────────────────────────
CREATE POLICY "tenant_isolation_nf_workflow_config" ON public.nf_workflow_config
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_insert_nf_workflow_config" ON public.nf_workflow_config
  FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id());

-- ─── pj_document_types ───────────────────────────────────────
CREATE POLICY "tenant_isolation_pj_document_types" ON public.pj_document_types
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_insert_pj_document_types" ON public.pj_document_types
  FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id());

-- ─── pj_documents ────────────────────────────────────────────
-- Admin do tenant: acesso total
CREATE POLICY "tenant_isolation_pj_documents" ON public.pj_documents
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_insert_pj_documents" ON public.pj_documents
  FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id());

-- PJ pode ver seus próprios documentos
CREATE POLICY "pj_select_own_documents" ON public.pj_documents
  FOR SELECT
  USING (pj_id IN (
    SELECT pa.pj_id FROM public.pj_portal_access pa WHERE pa.user_id = auth.uid()
  ));

-- PJ pode fazer upload de documentos (insert)
CREATE POLICY "pj_insert_documents" ON public.pj_documents
  FOR INSERT
  WITH CHECK (pj_id IN (
    SELECT pa.pj_id FROM public.pj_portal_access pa WHERE pa.user_id = auth.uid()
  ));

-- ─── pj_document_versions ────────────────────────────────────
-- Admin do tenant: acesso via pj_documents do tenant
CREATE POLICY "tenant_isolation_pj_document_versions" ON public.pj_document_versions
  USING (pj_document_id IN (
    SELECT d.id FROM public.pj_documents d WHERE d.tenant_id = get_user_tenant_id()
  ));

CREATE POLICY "tenant_insert_pj_document_versions" ON public.pj_document_versions
  FOR INSERT
  WITH CHECK (pj_document_id IN (
    SELECT d.id FROM public.pj_documents d WHERE d.tenant_id = get_user_tenant_id()
  ));

-- PJ pode ver versões de seus próprios documentos
CREATE POLICY "pj_select_own_document_versions" ON public.pj_document_versions
  FOR SELECT
  USING (pj_document_id IN (
    SELECT d.id FROM public.pj_documents d
    WHERE d.pj_id IN (
      SELECT pa.pj_id FROM public.pj_portal_access pa WHERE pa.user_id = auth.uid()
    )
  ));

-- PJ pode inserir novas versões de seus próprios documentos
CREATE POLICY "pj_insert_document_versions" ON public.pj_document_versions
  FOR INSERT
  WITH CHECK (pj_document_id IN (
    SELECT d.id FROM public.pj_documents d
    WHERE d.pj_id IN (
      SELECT pa.pj_id FROM public.pj_portal_access pa WHERE pa.user_id = auth.uid()
    )
  ));

-- ─── pj_tax_settings ─────────────────────────────────────────
-- Somente admin gerencia alíquotas
CREATE POLICY "tenant_isolation_pj_tax_settings" ON public.pj_tax_settings
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_insert_pj_tax_settings" ON public.pj_tax_settings
  FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id());

-- ─── pj_tax_retentions ───────────────────────────────────────
-- Admin do tenant: vê todas as retenções
CREATE POLICY "tenant_isolation_pj_tax_retentions" ON public.pj_tax_retentions
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_insert_pj_tax_retentions" ON public.pj_tax_retentions
  FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id());

-- PJ pode ver suas próprias retenções (transparência fiscal)
CREATE POLICY "pj_select_own_tax_retentions" ON public.pj_tax_retentions
  FOR SELECT
  USING (pj_id IN (
    SELECT pa.pj_id FROM public.pj_portal_access pa WHERE pa.user_id = auth.uid()
  ));

-- ─── pj_repasse_schedules ────────────────────────────────────
-- Somente admin gerencia schedules de repasse
CREATE POLICY "tenant_isolation_pj_repasse_schedules" ON public.pj_repasse_schedules
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_insert_pj_repasse_schedules" ON public.pj_repasse_schedules
  FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id());
