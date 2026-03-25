
-- Add SaaS/subscription columns to products
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_parent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_subscription boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS billing_cycle text,
  ADD COLUMN IF NOT EXISTS plan_tier text,
  ADD COLUMN IF NOT EXISTS setup_fee numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trial_days integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS annual_discount_percent numeric DEFAULT 0;

-- Index for product hierarchy
CREATE INDEX IF NOT EXISTS idx_products_parent_id ON public.products(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_is_parent ON public.products(is_parent) WHERE is_parent = true;

-- Add subscription columns to contracts
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS contract_type_extended text,
  ADD COLUMN IF NOT EXISTS auto_renew boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS next_billing_date date,
  ADD COLUMN IF NOT EXISTS mrr numeric DEFAULT 0;

-- Add recurring billing columns to receivables
ALTER TABLE public.receivables
  ADD COLUMN IF NOT EXISTS subscription_id uuid,
  ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS billing_period_start date,
  ADD COLUMN IF NOT EXISTS billing_period_end date;

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  product_id uuid NOT NULL REFERENCES public.products(id),
  plan_sku_id uuid NOT NULL REFERENCES public.products(id),
  customer_id uuid REFERENCES public.customers(id),
  status text NOT NULL DEFAULT 'active',
  billing_cycle text NOT NULL DEFAULT 'monthly',
  price numeric NOT NULL DEFAULT 0,
  mrr numeric NOT NULL DEFAULT 0,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  next_billing_date date,
  cancelled_at timestamptz,
  trial_ends_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for subscriptions" ON public.subscriptions
  FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id())
  WITH CHECK (tenant_id = public.get_user_tenant_id());

-- Add foreign key from receivables to subscriptions
ALTER TABLE public.receivables
  ADD CONSTRAINT receivables_subscription_id_fkey 
  FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE SET NULL;

-- Index for subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON public.subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing ON public.subscriptions(next_billing_date) WHERE status = 'active';
