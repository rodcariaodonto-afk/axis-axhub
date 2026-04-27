-- ============================================================================
-- Migration: Financial Accounting Module — DRE, Balanço, Fluxo Projetado
-- Slice 1 (v3 — schema real + audit_logs removido)
-- Data: 2026-04-27
-- ============================================================================

BEGIN;

-- 1.1 — payables: classificação contábil
ALTER TABLE public.payables
  ADD COLUMN IF NOT EXISTS accounting_type TEXT
    CHECK (accounting_type IN (
      'custo_operacional',
      'despesa_administrativa',
      'despesa_comercial',
      'despesa_financeira',
      'investimento',
      'passivo_circulante',
      'passivo_nao_circulante'
    )) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS accounting_group TEXT DEFAULT NULL;

COMMENT ON COLUMN public.payables.accounting_type IS 'Classificação contábil para DRE/Balanço Patrimonial';
COMMENT ON COLUMN public.payables.accounting_group IS 'Agrupamento livre (ex: Pessoal, Marketing, Infraestrutura)';

-- 1.2 — receivables: classificação contábil
ALTER TABLE public.receivables
  ADD COLUMN IF NOT EXISTS accounting_type TEXT
    CHECK (accounting_type IN (
      'receita_operacional',
      'receita_financeira',
      'receita_nao_operacional',
      'ativo_circulante',
      'ativo_nao_circulante'
    )) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS accounting_group TEXT DEFAULT NULL;

COMMENT ON COLUMN public.receivables.accounting_type IS 'Classificação contábil para DRE/Balanço Patrimonial';
COMMENT ON COLUMN public.receivables.accounting_group IS 'Agrupamento livre';

-- 1.3 — balance_sheet_entries
CREATE TABLE IF NOT EXISTS public.balance_sheet_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  reference_date DATE NOT NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN (
    'ativo_circulante',
    'ativo_nao_circulante',
    'passivo_circulante',
    'passivo_nao_circulante',
    'patrimonio_liquido'
  )),
  account_name TEXT NOT NULL,
  account_code TEXT DEFAULT NULL,
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes TEXT DEFAULT NULL,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'xml_import', 'pdf_import')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.balance_sheet_entries IS 'Lançamentos manuais do Balanço Patrimonial (capital social, reservas, ajustes contábeis)';

ALTER TABLE public.balance_sheet_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_balance_sheet" ON public.balance_sheet_entries;
CREATE POLICY "tenant_isolation_balance_sheet" ON public.balance_sheet_entries
  FOR SELECT USING (tenant_id = get_user_tenant_id());

DROP POLICY IF EXISTS "tenant_insert_balance_sheet" ON public.balance_sheet_entries;
CREATE POLICY "tenant_insert_balance_sheet" ON public.balance_sheet_entries
  FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());

DROP POLICY IF EXISTS "tenant_update_balance_sheet" ON public.balance_sheet_entries;
CREATE POLICY "tenant_update_balance_sheet" ON public.balance_sheet_entries
  FOR UPDATE USING (tenant_id = get_user_tenant_id());

DROP POLICY IF EXISTS "tenant_delete_balance_sheet" ON public.balance_sheet_entries;
CREATE POLICY "tenant_delete_balance_sheet" ON public.balance_sheet_entries
  FOR DELETE USING (tenant_id = get_user_tenant_id());

DROP TRIGGER IF EXISTS set_balance_sheet_updated_at ON public.balance_sheet_entries;
CREATE TRIGGER set_balance_sheet_updated_at
  BEFORE UPDATE ON public.balance_sheet_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 1.4 — cash_flow_projections
CREATE TABLE IF NOT EXISTS public.cash_flow_projections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  reference_month DATE NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  projected_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  actual_amount NUMERIC(15,2) DEFAULT NULL,
  flow_type TEXT NOT NULL CHECK (flow_type IN ('entrada', 'saida')),
  is_recurring BOOLEAN DEFAULT FALSE,
  notes TEXT DEFAULT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.cash_flow_projections IS 'Projeções manuais de fluxo de caixa para acompanhamento Projetado vs Realizado';

ALTER TABLE public.cash_flow_projections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_cfp" ON public.cash_flow_projections;
CREATE POLICY "tenant_isolation_cfp" ON public.cash_flow_projections
  FOR SELECT USING (tenant_id = get_user_tenant_id());

DROP POLICY IF EXISTS "tenant_insert_cfp" ON public.cash_flow_projections;
CREATE POLICY "tenant_insert_cfp" ON public.cash_flow_projections
  FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());

DROP POLICY IF EXISTS "tenant_update_cfp" ON public.cash_flow_projections;
CREATE POLICY "tenant_update_cfp" ON public.cash_flow_projections
  FOR UPDATE USING (tenant_id = get_user_tenant_id());

DROP POLICY IF EXISTS "tenant_delete_cfp" ON public.cash_flow_projections;
CREATE POLICY "tenant_delete_cfp" ON public.cash_flow_projections
  FOR DELETE USING (tenant_id = get_user_tenant_id());

DROP TRIGGER IF EXISTS set_cfp_updated_at ON public.cash_flow_projections;
CREATE TRIGGER set_cfp_updated_at
  BEFORE UPDATE ON public.cash_flow_projections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 1.5 — Índices
CREATE INDEX IF NOT EXISTS idx_payables_tenant_accounting
  ON public.payables(tenant_id, accounting_type, paid_at);

CREATE INDEX IF NOT EXISTS idx_receivables_tenant_accounting
  ON public.receivables(tenant_id, accounting_type, paid_at);

CREATE INDEX IF NOT EXISTS idx_bse_tenant_date
  ON public.balance_sheet_entries(tenant_id, reference_date);

CREATE INDEX IF NOT EXISTS idx_cfp_tenant_month
  ON public.cash_flow_projections(tenant_id, reference_month);

-- 1.6 — Auto-classificação PAYABLES (via finance_categories.name)
UPDATE public.payables p
SET accounting_type = 'custo_operacional'
FROM public.finance_categories fc
WHERE p.category_id = fc.id
  AND p.accounting_type IS NULL
  AND lower(fc.name) IN (
    'bpo programação',
    'flow - caria',
    'fornecedores',
    'manus - caria',
    'lovable',
    'lovable - arnaut',
    'lovable - caria'
  );

UPDATE public.payables p
SET accounting_type = 'despesa_comercial'
FROM public.finance_categories fc
WHERE p.category_id = fc.id
  AND p.accounting_type IS NULL
  AND lower(fc.name) IN (
    'bpo markekting',
    'growth machine - rico',
    'locação para eventos'
  );

UPDATE public.payables p
SET accounting_type = 'despesa_administrativa'
FROM public.finance_categories fc
WHERE p.category_id = fc.id
  AND p.accounting_type IS NULL
  AND lower(fc.name) IN (
    'cloudfy - caria',
    'consultoria externa',
    'contabilidade',
    'gpt - cária'
  );

-- 1.7 — Auto-classificação RECEIVABLES
UPDATE public.receivables r
SET accounting_type = 'receita_operacional'
FROM public.finance_categories fc
WHERE r.category_id = fc.id
  AND r.accounting_type IS NULL
  AND lower(fc.name) IN (
    'curso - ia do zero ao lucro',
    'fee mensal',
    'venda avulça'
  );

UPDATE public.receivables r
SET accounting_type = 'receita_nao_operacional'
FROM public.finance_categories fc
WHERE r.category_id = fc.id
  AND r.accounting_type IS NULL
  AND lower(fc.name) = 'estorno financeiro - entrada';

COMMIT;
