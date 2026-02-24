
-- 1. Create opportunity_stages table
CREATE TABLE public.opportunity_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  color VARCHAR(20) NOT NULL DEFAULT '#3B82F6',
  is_won BOOLEAN NOT NULL DEFAULT false,
  is_lost BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

ALTER TABLE public.opportunity_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for opportunity_stages"
  ON public.opportunity_stages FOR ALL
  USING (tenant_id = public.get_user_tenant_id())
  WITH CHECK (tenant_id = public.get_user_tenant_id());

-- 2. Create opportunities table
CREATE TABLE public.opportunities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.crm_accounts(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  stage VARCHAR(100) NOT NULL DEFAULT 'Prospecting',
  probability NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (probability >= 0 AND probability <= 1),
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
  expected_close_date DATE,
  close_date DATE,
  close_reason TEXT,
  owner_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for opportunities"
  ON public.opportunities FOR ALL
  USING (tenant_id = public.get_user_tenant_id())
  WITH CHECK (tenant_id = public.get_user_tenant_id());

-- 3. Indexes
CREATE INDEX idx_opportunities_tenant_id ON public.opportunities(tenant_id);
CREATE INDEX idx_opportunities_account_id ON public.opportunities(account_id);
CREATE INDEX idx_opportunities_owner_id ON public.opportunities(owner_id);
CREATE INDEX idx_opportunities_stage ON public.opportunities(stage);
CREATE INDEX idx_opportunities_is_active ON public.opportunities(is_active);
CREATE INDEX idx_opportunity_stages_tenant_id ON public.opportunity_stages(tenant_id);

-- 4. Trigger for updated_at
CREATE TRIGGER set_opportunities_updated_at
  BEFORE UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Update handle_new_user to create default opportunity stages
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_tenant_id uuid;
  new_pipeline_id uuid;
BEGIN
  INSERT INTO public.tenants (name) 
  VALUES (COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  RETURNING id INTO new_tenant_id;

  INSERT INTO public.profiles (id, tenant_id, full_name, email)
  VALUES (NEW.id, new_tenant_id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');

  -- Create default warehouse
  INSERT INTO public.warehouses (tenant_id, name, is_default) VALUES (new_tenant_id, 'Depósito Principal', true);

  -- Create default sales pipeline
  INSERT INTO public.sales_pipelines (tenant_id, name, is_default) VALUES (new_tenant_id, 'Pipeline Padrão', true) RETURNING id INTO new_pipeline_id;
  INSERT INTO public.pipeline_stages (tenant_id, pipeline_id, name, "order", probability) VALUES
    (new_tenant_id, new_pipeline_id, 'Qualificação', 1, 10),
    (new_tenant_id, new_pipeline_id, 'Proposta', 2, 30),
    (new_tenant_id, new_pipeline_id, 'Negociação', 3, 60),
    (new_tenant_id, new_pipeline_id, 'Fechamento', 4, 90);

  -- Create default BI dashboards
  PERFORM public.create_default_bi_dashboards(new_tenant_id, NEW.id);

  -- Create default opportunity stages
  INSERT INTO public.opportunity_stages (tenant_id, name, order_index, color, is_won, is_lost) VALUES
    (new_tenant_id, 'Prospecting', 1, '#6B7280', false, false),
    (new_tenant_id, 'Qualification', 2, '#3B82F6', false, false),
    (new_tenant_id, 'Proposal', 3, '#8B5CF6', false, false),
    (new_tenant_id, 'Negotiation', 4, '#F59E0B', false, false),
    (new_tenant_id, 'Closed Won', 5, '#10B981', true, false),
    (new_tenant_id, 'Closed Lost', 6, '#EF4444', false, true);

  RETURN NEW;
END;
$function$;
