-- =============================================================================
-- Super Admin Module — AXHUB
-- Cria infraestrutura para gestão SaaS multi-tenant pelo time interno AXHolding
-- Escopo desta migration: tabela super_admins, RPC is_super_admin(),
-- colunas extras em tenants, RLS bypass para tenants e profiles, e view de
-- métricas globais. Outras tabelas terão policy de bypass em migration futura.
-- =============================================================================

-- 1. Tabela de super admins (whitelist)
CREATE TABLE IF NOT EXISTS public.super_admins (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  notes      text
);

ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- 2. RPC is_super_admin() — usada em todas as policies de bypass
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.super_admins
    WHERE user_id = auth.uid()
  );
$$;

COMMENT ON FUNCTION public.is_super_admin() IS
  'Retorna true se o usuario autenticado esta na whitelist super_admins. Usar em RLS policies para bypass de tenant isolation.';

-- 3. Policies da tabela super_admins
-- Leitura: somente super admins veem a lista
CREATE POLICY "super_admins_select_self_only"
  ON public.super_admins
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

-- INSERT/UPDATE/DELETE bloqueados via RLS de proposito.
-- Adicionar/remover super admin deve ser feito via SQL direto no Supabase
-- (que usa service_role e bypassa RLS). Isso evita auto-escalada de privilegio
-- caso uma conta super admin seja comprometida.

-- 4. Colunas extras em tenants para gestao SaaS
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS is_active         boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS suspended_at      timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_reason  text,
  ADD COLUMN IF NOT EXISTS deleted_at        timestamptz,
  ADD COLUMN IF NOT EXISTS plan_name         text DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS admin_notes       text;

-- 5. Policies de bypass para super admin (apenas tenants e profiles nesta fase)
-- IMPORTANTE: policies PERMISSIVE sao unidas por OR com as existentes,
-- entao usuarios normais continuam funcionando exatamente como antes.

DROP POLICY IF EXISTS "super_admin_full_access_tenants" ON public.tenants;
CREATE POLICY "super_admin_full_access_tenants"
  ON public.tenants
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "super_admin_full_access_profiles" ON public.profiles;
CREATE POLICY "super_admin_full_access_profiles"
  ON public.profiles
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- 6. View de metricas globais por tenant (sem subscriptions por enquanto)
-- A view herda a seguranca das tabelas subjacentes via RLS.
-- Como tenants e profiles tem policy de bypass para super admin, somente
-- super admin vera todos os tenants. Usuario normal vera apenas o proprio.
CREATE OR REPLACE VIEW public.v_global_tenant_metrics AS
SELECT
  t.id,
  t.name,
  t.is_active,
  t.suspended_at,
  t.suspended_reason,
  t.deleted_at,
  t.plan_name,
  t.created_at,
  (SELECT COUNT(*) FROM public.profiles p
     WHERE p.tenant_id = t.id) AS user_count,
  (SELECT COUNT(*) FROM public.profiles p
     WHERE p.tenant_id = t.id AND p.status = 'active') AS active_user_count
FROM public.tenants t;

COMMENT ON VIEW public.v_global_tenant_metrics IS
  'Metricas agregadas por tenant. Visivel somente a super admins via RLS das tabelas subjacentes.';

-- 7. Seed do super admin inicial
-- Insercao condicional: so insere se o usuario existir em auth.users
-- e se ele ainda nao estiver em super_admins.
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'rodrigo.axhub@gmail.com'
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.super_admins (user_id, email, notes)
    VALUES (v_user_id, 'rodrigo.axhub@gmail.com', 'Super admin inicial - seed da migration')
    ON CONFLICT (user_id) DO NOTHING;

    RAISE NOTICE 'Super admin seed: usuario rodrigo.axhub@gmail.com adicionado';
  ELSE
    RAISE NOTICE 'Super admin seed: usuario rodrigo.axhub@gmail.com nao encontrado em auth.users. Crie a conta primeiro e rode o INSERT manualmente.';
  END IF;
END $$;
