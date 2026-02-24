
-- 1. Add columns to contracts
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS contract_type varchar(50),
  ADD COLUMN IF NOT EXISTS currency varchar(3) NOT NULL DEFAULT 'BRL',
  ADD COLUMN IF NOT EXISTS renewal_date date,
  ADD COLUMN IF NOT EXISTS owner_id uuid,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS signature_status varchar(20) NOT NULL DEFAULT 'Unsigned',
  ADD COLUMN IF NOT EXISTS signed_by_id uuid,
  ADD COLUMN IF NOT EXISTS signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS signature_token varchar(255);

-- 2. Indexes on contracts
CREATE INDEX IF NOT EXISTS idx_contracts_account_id ON public.contracts(account_id);
CREATE INDEX IF NOT EXISTS idx_contracts_owner_id ON public.contracts(owner_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_is_active ON public.contracts(is_active);

-- 3. Create contract_versions table
CREATE TABLE public.contract_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  version_number integer NOT NULL DEFAULT 1,
  name text NOT NULL,
  description text,
  contract_type varchar(50),
  status text NOT NULL,
  value numeric,
  currency varchar(3) DEFAULT 'BRL',
  start_date date,
  end_date date,
  renewal_date date,
  changed_by_id uuid,
  change_description text,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_contract_versions_contract_id ON public.contract_versions(contract_id);

ALTER TABLE public.contract_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON public.contract_versions
  AS RESTRICTIVE FOR ALL
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- 4. Create contract_signatures table
CREATE TABLE public.contract_signatures (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  signer_id uuid,
  signature_url text,
  signed_at timestamptz NOT NULL DEFAULT now(),
  ip_address varchar(45),
  signature_token varchar(255) UNIQUE,
  is_valid boolean NOT NULL DEFAULT true,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_contract_signatures_contract_id ON public.contract_signatures(contract_id);

ALTER TABLE public.contract_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON public.contract_signatures
  AS RESTRICTIVE FOR ALL
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());
