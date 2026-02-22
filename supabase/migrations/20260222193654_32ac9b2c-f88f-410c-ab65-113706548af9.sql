
-- Adicionar colunas na tabela profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS default_theme TEXT NOT NULL DEFAULT 'dark',
  ADD COLUMN IF NOT EXISTS default_menu TEXT NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS farewell_message TEXT;

-- Criar tabela user_work_hours
CREATE TABLE public.user_work_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL DEFAULT '08:00',
  end_time TIME NOT NULL DEFAULT '18:00',
  is_working_day BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_work_hours_user_id ON public.user_work_hours(user_id);
CREATE INDEX idx_user_work_hours_day ON public.user_work_hours(day_of_week);

ALTER TABLE public.user_work_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON public.user_work_hours
  FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE TRIGGER update_user_work_hours_updated_at
  BEFORE UPDATE ON public.user_work_hours
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Criar tabela user_permissions
CREATE TABLE public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  module_name VARCHAR(50) NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT false,
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  can_export BOOLEAN NOT NULL DEFAULT false,
  can_manage_users BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, module_name)
);

CREATE INDEX idx_user_permissions_user_id ON public.user_permissions(user_id);
CREATE INDEX idx_user_permissions_module ON public.user_permissions(module_name);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON public.user_permissions
  FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE TRIGGER update_user_permissions_updated_at
  BEFORE UPDATE ON public.user_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
