
-- 1. Create contract_templates table
CREATE TABLE public.contract_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL DEFAULT 'custom',
  content TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- 2. Add template_id to contracts
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.contract_templates(id);

-- 3. RLS
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contract_templates_select" ON public.contract_templates
  FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY "contract_templates_insert" ON public.contract_templates
  FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "contract_templates_update" ON public.contract_templates
  FOR UPDATE USING (tenant_id = get_user_tenant_id());

CREATE POLICY "contract_templates_delete" ON public.contract_templates
  FOR DELETE USING (tenant_id = get_user_tenant_id());

-- 4. Updated_at trigger
CREATE TRIGGER update_contract_templates_updated_at
  BEFORE UPDATE ON public.contract_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
