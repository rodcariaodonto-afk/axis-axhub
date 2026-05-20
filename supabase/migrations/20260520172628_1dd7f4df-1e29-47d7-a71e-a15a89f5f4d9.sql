
-- 1. Add Clicksign columns to contracts
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS clicksign_document_key text,
  ADD COLUMN IF NOT EXISTS clicksign_envelope_url text,
  ADD COLUMN IF NOT EXISTS clicksign_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_contracts_clicksign_doc_key
  ON public.contracts(clicksign_document_key)
  WHERE clicksign_document_key IS NOT NULL;

-- 2. Contract signers table
CREATE TABLE IF NOT EXISTS public.contract_signers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  signing_order int NOT NULL DEFAULT 1,
  provider_signer_id text,
  signing_url text,
  status text NOT NULL DEFAULT 'pending', -- pending | sent | signed | refused
  signed_at timestamptz,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contract_signers_contract ON public.contract_signers(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_signers_tenant ON public.contract_signers(tenant_id);

ALTER TABLE public.contract_signers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant can view contract signers"
  ON public.contract_signers FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "tenant can insert contract signers"
  ON public.contract_signers FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "tenant can update contract signers"
  ON public.contract_signers FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "tenant can delete contract signers"
  ON public.contract_signers FOR DELETE
  USING (tenant_id = public.get_user_tenant_id());

CREATE TRIGGER trg_contract_signers_updated_at
  BEFORE UPDATE ON public.contract_signers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Private bucket for signed PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('signed-contracts', 'signed-contracts', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Tenant users can read signed contracts"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'signed-contracts'
    AND (storage.foldername(name))[1] = public.get_user_tenant_id()::text
  );

CREATE POLICY "Service role manages signed contracts"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'signed-contracts');
