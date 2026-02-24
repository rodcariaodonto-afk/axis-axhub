
-- Tabela de Contratos
CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
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

-- Indices de performance
CREATE INDEX IF NOT EXISTS idx_contacts_account ON public.contacts(account_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON public.deals(stage_id);
CREATE INDEX IF NOT EXISTS idx_deals_pipeline ON public.deals(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_contracts_account ON public.contracts(account_id);
CREATE INDEX IF NOT EXISTS idx_contracts_deal ON public.contracts(deal_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
