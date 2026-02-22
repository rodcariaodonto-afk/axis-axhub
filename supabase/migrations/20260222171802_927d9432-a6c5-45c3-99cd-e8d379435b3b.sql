
-- Fix whatsapp_contact_status: drop RESTRICTIVE policy, create PERMISSIVE
DROP POLICY IF EXISTS "Tenant isolation" ON public.whatsapp_contact_status;
CREATE POLICY "Tenant isolation permissive" ON public.whatsapp_contact_status
  FOR ALL
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- Fix whatsapp_contact_tags: drop RESTRICTIVE policy, create PERMISSIVE
DROP POLICY IF EXISTS "Tenant isolation" ON public.whatsapp_contact_tags;
CREATE POLICY "Tenant isolation permissive" ON public.whatsapp_contact_tags
  FOR ALL
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());
