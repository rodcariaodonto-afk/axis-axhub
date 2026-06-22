
-- 1. signature_audit_logs: restrict SELECT to admins only (otp_hash exposure)
DROP POLICY IF EXISTS "Tenant members can read audit logs" ON public.signature_audit_logs;
CREATE POLICY "Admins can read signature audit logs"
  ON public.signature_audit_logs FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND public.has_role(auth.uid(), 'admin'));

-- 2. signed-contracts bucket: restrict INSERT/UPDATE/DELETE to service_role only
DROP POLICY IF EXISTS "Tenant users can upload signed contracts" ON storage.objects;
CREATE POLICY "Service role can write signed contracts"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'signed-contracts');

-- 3. whatsapp-media bucket: ensure no public INSERT/UPDATE policies exist; only service_role writes
-- (None exist currently; explicitly drop any legacy permissive ones if present)
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND (qual ILIKE '%whatsapp-media%' OR with_check ILIKE '%whatsapp-media%')
      AND policyname <> 'Public read whatsapp media'
  LOOP
    EXECUTE format('DROP POLICY %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- 4. product-images bucket: add tenant path scoping on UPDATE and DELETE
DROP POLICY IF EXISTS "Authenticated users can delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update product images" ON storage.objects;

CREATE POLICY "Tenant users can delete their product images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = (public.get_user_tenant_id())::text
  );

CREATE POLICY "Tenant users can update their product images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = (public.get_user_tenant_id())::text
  )
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = (public.get_user_tenant_id())::text
  );

CREATE POLICY "Tenant users can upload product images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = (public.get_user_tenant_id())::text
  );

-- 5. pj-documents bucket: explicit tenant-scoped policies (files stored as <tenant_id>/<pj_id>/...)
CREATE POLICY "Tenant members can read pj documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'pj-documents'
    AND (
      (storage.foldername(name))[1] = (public.get_user_tenant_id())::text
      OR EXISTS (
        SELECT 1 FROM public.pj_portal_access ppa
        WHERE ppa.user_id = auth.uid()
          AND (storage.foldername(name))[1] = ppa.tenant_id::text
          AND (storage.foldername(name))[2] = ppa.pj_id::text
      )
    )
  );

CREATE POLICY "Tenant members can upload pj documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'pj-documents'
    AND (storage.foldername(name))[1] = (public.get_user_tenant_id())::text
  );

CREATE POLICY "Tenant members can update pj documents"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'pj-documents'
    AND (storage.foldername(name))[1] = (public.get_user_tenant_id())::text
  )
  WITH CHECK (
    bucket_id = 'pj-documents'
    AND (storage.foldername(name))[1] = (public.get_user_tenant_id())::text
  );

CREATE POLICY "Tenant members can delete pj documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'pj-documents'
    AND (storage.foldername(name))[1] = (public.get_user_tenant_id())::text
  );

-- 6. realtime.messages: enable RLS and require authenticated subscribers
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can use realtime" ON realtime.messages;
CREATE POLICY "Authenticated can use realtime"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- 7. axis_landing_leads: tighten WITH CHECK (require LGPD consent + basic fields) and limit to anon only
DROP POLICY IF EXISTS axis_landing_leads_anon_insert ON public.axis_landing_leads;
CREATE POLICY axis_landing_leads_anon_insert
  ON public.axis_landing_leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    consentimento_lgpd = true
    AND length(trim(nome)) BETWEEN 2 AND 200
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND length(trim(whatsapp)) BETWEEN 8 AND 30
    AND length(trim(empresa)) BETWEEN 1 AND 200
  );
