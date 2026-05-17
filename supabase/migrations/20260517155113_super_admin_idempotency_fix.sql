-- =============================================================================
-- Super Admin Module — Idempotency Fix
-- Corrige migration anterior (20260517154115) que falha em re-execucao
-- por causa da policy "super_admins_select_self_only" criada sem DROP IF EXISTS.
-- Esta migration eh segura para rodar mesmo se a anterior ja aplicou tudo.
-- =============================================================================

-- 1. Recriar policy de SELECT em super_admins de forma idempotente
DROP POLICY IF EXISTS "super_admins_select_self_only" ON public.super_admins;
CREATE POLICY "super_admins_select_self_only"
  ON public.super_admins
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

-- 2. Garantir idempotencia das policies de bypass (caso futuramente
-- precisem ser re-aplicadas em outro ambiente)
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

-- Esta migration nao altera comportamento, apenas garante que re-execucoes
-- nao falhem com erro 42710 ("policy already exists").
