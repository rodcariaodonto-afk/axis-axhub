
-- Fix: campanhas RLS policy is restrictive but needs to be permissive
DROP POLICY IF EXISTS "Tenant isolation" ON public.campanhas;
CREATE POLICY "Tenant isolation" ON public.campanhas
  FOR ALL
  TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- Fix same issue on campanhas_configuracoes
DROP POLICY IF EXISTS "Tenant isolation" ON public.campanhas_configuracoes;
CREATE POLICY "Tenant isolation" ON public.campanhas_configuracoes
  FOR ALL
  TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- Fix same issue on campanhas_contatos
DROP POLICY IF EXISTS "Tenant isolation" ON public.campanhas_contatos;
CREATE POLICY "Tenant isolation" ON public.campanhas_contatos
  FOR ALL
  TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- Fix same issue on campanhas_historico_envios
DROP POLICY IF EXISTS "Tenant isolation" ON public.campanhas_historico_envios;
CREATE POLICY "Tenant isolation" ON public.campanhas_historico_envios
  FOR ALL
  TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());
