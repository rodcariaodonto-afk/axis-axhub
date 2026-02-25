
CREATE TABLE public.finance_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('receita', 'despesa')),
  color TEXT NOT NULL DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "finance_categories_select" ON public.finance_categories
  FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY "finance_categories_insert" ON public.finance_categories
  FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "finance_categories_update" ON public.finance_categories
  FOR UPDATE USING (tenant_id = get_user_tenant_id());

CREATE POLICY "finance_categories_delete" ON public.finance_categories
  FOR DELETE USING (tenant_id = get_user_tenant_id());

CREATE TRIGGER update_finance_categories_updated_at
  BEFORE UPDATE ON public.finance_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
