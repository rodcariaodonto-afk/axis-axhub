
CREATE TABLE public.bank_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  from_account_id uuid NOT NULL REFERENCES public.bank_accounts(id),
  to_account_id uuid NOT NULL REFERENCES public.bank_accounts(id),
  amount numeric NOT NULL,
  transfer_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bank_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON public.bank_transfers
  FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id())
  WITH CHECK (tenant_id = public.get_user_tenant_id());
