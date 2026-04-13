
-- 1. Nova tabela signature_audit_logs
CREATE TABLE public.signature_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  signer_email TEXT NOT NULL,
  signer_name TEXT,
  otp_hash TEXT,
  otp_expires_at TIMESTAMPTZ,
  otp_verified BOOLEAN DEFAULT false,
  ip_address TEXT,
  user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.signature_audit_logs ENABLE ROW LEVEL SECURITY;

-- SELECT only for tenant members
CREATE POLICY "Tenant members can read audit logs"
  ON public.signature_audit_logs
  FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- No INSERT/UPDATE/DELETE via RLS — only service role edge functions can write

-- 2. Add columns to contracts
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS signer_email TEXT;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS signer_name TEXT;

-- 3. Private storage bucket for contract PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('axis-contracts', 'axis-contracts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for axis-contracts
CREATE POLICY "Authenticated users can upload contract PDFs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'axis-contracts');

CREATE POLICY "Authenticated users can read contract PDFs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'axis-contracts');

-- Index for performance
CREATE INDEX idx_signature_audit_logs_contract ON public.signature_audit_logs (contract_id);
CREATE INDEX idx_signature_audit_logs_tenant ON public.signature_audit_logs (tenant_id);
