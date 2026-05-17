-- =============================================================================
-- Super Admin Module - Bypass policies para audit_logs e user_roles
-- =============================================================================
-- Adiciona policies PERMISSIVE para que super admin (verificado via
-- public.is_super_admin()) possa ler/escrever em audit_logs e user_roles
-- cross-tenant, sem afetar o isolamento de tenant para usuarios normais.
--
-- Policies PERMISSIVE sao unidas por OR com as existentes:
-- - Tenants normais continuam ver apenas seu proprio escopo
-- - Super admin ve tudo
-- =============================================================================

-- Bypass em audit_logs (super admin precisa ver atividade de todos os tenants)
DROP POLICY IF EXISTS "super_admin_full_access_audit_logs" ON public.audit_logs;
CREATE POLICY "super_admin_full_access_audit_logs"
  ON public.audit_logs
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Bypass em user_roles (super admin precisa ver/gerenciar roles cross-tenant)
DROP POLICY IF EXISTS "super_admin_full_access_user_roles" ON public.user_roles;
CREATE POLICY "super_admin_full_access_user_roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Nota: outras tabelas (leads, accounts, deals, etc.) NAO recebem bypass
-- nesta fase pois o Super Admin nao precisa ler dados de negocio diretamente
-- (so metricas agregadas via v_global_tenant_metrics e contagens).
-- Se em fases futuras o Super Admin precisar ver dados de negocio especificos
-- de um tenant, adicionar policies pontuais aqui.
