
-- CRM Tables

-- Leads
CREATE TABLE public.leads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  name text NOT NULL,
  email text,
  phone text,
  source text DEFAULT 'manual',
  tags text[] DEFAULT '{}',
  score integer DEFAULT 0,
  status text NOT NULL DEFAULT 'new',
  owner_user_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.leads FOR ALL USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- CRM Accounts
CREATE TABLE public.crm_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  name text NOT NULL,
  cnpj text,
  segment text,
  phone text,
  email text,
  address_json jsonb,
  owner_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.crm_accounts FOR ALL USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());

-- Contacts
CREATE TABLE public.contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  account_id uuid REFERENCES public.crm_accounts(id),
  first_name text NOT NULL,
  last_name text,
  email text,
  phone text,
  position text,
  is_primary boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.contacts FOR ALL USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());

-- Sales Pipelines
CREATE TABLE public.sales_pipelines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  name text NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sales_pipelines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.sales_pipelines FOR ALL USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());

-- Pipeline Stages
CREATE TABLE public.pipeline_stages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  pipeline_id uuid NOT NULL REFERENCES public.sales_pipelines(id) ON DELETE CASCADE,
  name text NOT NULL,
  "order" integer NOT NULL DEFAULT 0,
  probability numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.pipeline_stages FOR ALL USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());

-- Deals
CREATE TABLE public.deals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  pipeline_id uuid NOT NULL REFERENCES public.sales_pipelines(id),
  stage_id uuid NOT NULL REFERENCES public.pipeline_stages(id),
  name text NOT NULL,
  lead_id uuid REFERENCES public.leads(id),
  contact_id uuid REFERENCES public.contacts(id),
  account_id uuid REFERENCES public.crm_accounts(id),
  estimated_value numeric DEFAULT 0,
  expected_close_date date,
  responsible_user_id uuid,
  status text NOT NULL DEFAULT 'open',
  lost_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.deals FOR ALL USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());
CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Activities
CREATE TABLE public.activities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  type text NOT NULL DEFAULT 'task',
  title text NOT NULL,
  description text,
  due_at timestamptz,
  done_at timestamptz,
  deal_id uuid REFERENCES public.deals(id),
  lead_id uuid REFERENCES public.leads(id),
  contact_id uuid REFERENCES public.contacts(id),
  owner_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.activities FOR ALL USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());

-- Update handle_new_user to create default pipeline
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

  RETURN NEW;
END;
$function$;
