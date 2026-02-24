
-- 1. Add new columns to activities
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS status varchar(50) NOT NULL DEFAULT 'Open',
  ADD COLUMN IF NOT EXISTS priority varchar(20) NOT NULL DEFAULT 'Normal',
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.crm_accounts(id),
  ADD COLUMN IF NOT EXISTS opportunity_id uuid REFERENCES public.opportunities(id),
  ADD COLUMN IF NOT EXISTS contract_id uuid REFERENCES public.contracts(id),
  ADD COLUMN IF NOT EXISTS created_by_id uuid,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 2. Backfill existing data: set status based on done_at
UPDATE public.activities SET status = 'Completed' WHERE done_at IS NOT NULL AND status = 'Open';

-- 3. Create activity_types table
CREATE TABLE IF NOT EXISTS public.activity_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  name varchar(100) NOT NULL,
  icon varchar(50) DEFAULT 'CalendarCheck',
  color varchar(20) DEFAULT '#6B7280',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- 4. RLS for activity_types
ALTER TABLE public.activity_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_types_tenant_isolation" ON public.activity_types
  FOR ALL USING (tenant_id = public.get_user_tenant_id());

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_activities_status ON public.activities(status);
CREATE INDEX IF NOT EXISTS idx_activities_priority ON public.activities(priority);
CREATE INDEX IF NOT EXISTS idx_activities_account_id ON public.activities(account_id);
CREATE INDEX IF NOT EXISTS idx_activities_opportunity_id ON public.activities(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_activities_contract_id ON public.activities(contract_id);
CREATE INDEX IF NOT EXISTS idx_activities_is_active ON public.activities(is_active);

-- 6. Trigger for updated_at on activities
CREATE OR REPLACE TRIGGER activities_updated_at
  BEFORE UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Update handle_new_user to create default activity types
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

  INSERT INTO public.warehouses (tenant_id, name, is_default) VALUES (new_tenant_id, 'Depósito Principal', true);

  INSERT INTO public.sales_pipelines (tenant_id, name, is_default) VALUES (new_tenant_id, 'Pipeline Padrão', true) RETURNING id INTO new_pipeline_id;
  INSERT INTO public.pipeline_stages (tenant_id, pipeline_id, name, "order", probability) VALUES
    (new_tenant_id, new_pipeline_id, 'Qualificação', 1, 10),
    (new_tenant_id, new_pipeline_id, 'Proposta', 2, 30),
    (new_tenant_id, new_pipeline_id, 'Negociação', 3, 60),
    (new_tenant_id, new_pipeline_id, 'Fechamento', 4, 90);

  PERFORM public.create_default_bi_dashboards(new_tenant_id, NEW.id);

  INSERT INTO public.opportunity_stages (tenant_id, name, order_index, color, is_won, is_lost) VALUES
    (new_tenant_id, 'Prospecting', 1, '#6B7280', false, false),
    (new_tenant_id, 'Qualification', 2, '#3B82F6', false, false),
    (new_tenant_id, 'Proposal', 3, '#8B5CF6', false, false),
    (new_tenant_id, 'Negotiation', 4, '#F59E0B', false, false),
    (new_tenant_id, 'Closed Won', 5, '#10B981', true, false),
    (new_tenant_id, 'Closed Lost', 6, '#EF4444', false, true);

  -- Create default activity types
  INSERT INTO public.activity_types (tenant_id, name, icon, color) VALUES
    (new_tenant_id, 'Call', 'Phone', '#3B82F6'),
    (new_tenant_id, 'Email', 'Mail', '#10B981'),
    (new_tenant_id, 'Meeting', 'Users', '#8B5CF6'),
    (new_tenant_id, 'Task', 'CheckSquare', '#F59E0B'),
    (new_tenant_id, 'Note', 'FileText', '#6B7280'),
    (new_tenant_id, 'WhatsApp', 'MessageCircle', '#25D366');

  RETURN NEW;
END;
$function$;
