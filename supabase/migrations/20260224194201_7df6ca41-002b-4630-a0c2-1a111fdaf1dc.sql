ALTER TABLE public.crm_accounts 
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_crm_accounts_is_active ON public.crm_accounts(is_active);