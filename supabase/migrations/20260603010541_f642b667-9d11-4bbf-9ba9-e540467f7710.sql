
-- =========================================================================
-- Security hardening migration
-- =========================================================================

-- ---- 1) form_response_drafts: remove anonymous table access; expose via RPCs
DROP POLICY IF EXISTS drafts_select_anon ON public.form_response_drafts;
DROP POLICY IF EXISTS drafts_update_anon ON public.form_response_drafts;
DROP POLICY IF EXISTS drafts_insert_anon ON public.form_response_drafts;

CREATE OR REPLACE FUNCTION public.get_form_draft(p_form_id uuid, p_draft_token text)
RETURNS TABLE(identify jsonb, answers jsonb, current_section int, step text)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT d.identify, d.answers, d.current_section, d.step
  FROM public.form_response_drafts d
  WHERE d.form_id = p_form_id
    AND d.draft_token = p_draft_token
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.upsert_form_draft(
  p_form_id uuid,
  p_tenant_id uuid,
  p_draft_token text,
  p_respondent_name text,
  p_respondent_email text,
  p_respondent_phone text,
  p_identify jsonb,
  p_answers jsonb,
  p_current_section int,
  p_step text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the form exists, is published, and belongs to the supplied tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.forms
    WHERE id = p_form_id AND tenant_id = p_tenant_id AND status = 'published'
  ) THEN
    RAISE EXCEPTION 'Form not found or not published';
  END IF;

  IF p_draft_token IS NULL OR length(p_draft_token) < 8 OR length(p_draft_token) > 128 THEN
    RAISE EXCEPTION 'Invalid draft_token';
  END IF;

  INSERT INTO public.form_response_drafts(
    form_id, tenant_id, draft_token,
    respondent_name, respondent_email, respondent_phone,
    identify, answers, current_section, step
  ) VALUES (
    p_form_id, p_tenant_id, p_draft_token,
    p_respondent_name, p_respondent_email, p_respondent_phone,
    p_identify, p_answers, p_current_section, p_step
  )
  ON CONFLICT (form_id, draft_token) DO UPDATE SET
    respondent_name  = EXCLUDED.respondent_name,
    respondent_email = EXCLUDED.respondent_email,
    respondent_phone = EXCLUDED.respondent_phone,
    identify         = EXCLUDED.identify,
    answers          = EXCLUDED.answers,
    current_section  = EXCLUDED.current_section,
    step             = EXCLUDED.step,
    updated_at       = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_form_draft(p_form_id uuid, p_draft_token text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.form_response_drafts
  WHERE form_id = p_form_id AND draft_token = p_draft_token;
$$;

REVOKE ALL ON FUNCTION public.get_form_draft(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_form_draft(uuid, uuid, text, text, text, text, jsonb, jsonb, int, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_form_draft(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_form_draft(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_form_draft(uuid, uuid, text, text, text, text, jsonb, jsonb, int, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_form_draft(uuid, text) TO anon, authenticated;

-- ---- 2) form_responses: add processed_at for idempotency
ALTER TABLE public.form_responses ADD COLUMN IF NOT EXISTS processed_at timestamptz;

-- ---- 3) storage.objects: axis-contracts scope by tenant folder
DROP POLICY IF EXISTS "Authenticated users can read contract PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload contract PDFs" ON storage.objects;

CREATE POLICY "Tenant users can read contract PDFs"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'axis-contracts'
    AND (storage.foldername(name))[1] = (public.get_user_tenant_id())::text
  );

CREATE POLICY "Tenant users can upload contract PDFs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'axis-contracts'
    AND (storage.foldername(name))[1] = (public.get_user_tenant_id())::text
  );

CREATE POLICY "Tenant users can update contract PDFs"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'axis-contracts'
    AND (storage.foldername(name))[1] = (public.get_user_tenant_id())::text
  );

CREATE POLICY "Tenant users can delete contract PDFs"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'axis-contracts'
    AND (storage.foldername(name))[1] = (public.get_user_tenant_id())::text
  );

-- ---- 4) storage.objects: signed-contracts — drop public INSERT, restrict to tenant uploads
DROP POLICY IF EXISTS "Service role manages signed contracts" ON storage.objects;

CREATE POLICY "Tenant users can upload signed contracts"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'signed-contracts'
    AND (storage.foldername(name))[1] = (public.get_user_tenant_id())::text
  );
-- service_role bypasses RLS, so no policy needed for backend uploads

-- ---- 5) storage.objects: whatsapp-media — drop anon insert/update
DROP POLICY IF EXISTS "Service role can upload whatsapp media" ON storage.objects;
DROP POLICY IF EXISTS "Service role can update whatsapp media" ON storage.objects;
-- service_role bypasses RLS; uploads happen via edge functions

-- ---- 6) api_keys: restrict reads to owner or tenant admin
DROP POLICY IF EXISTS "Tenant isolation" ON public.api_keys;

CREATE POLICY api_keys_select_owner_or_admin
  ON public.api_keys FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    AND (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
  );

CREATE POLICY api_keys_insert_self
  ON public.api_keys FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND user_id = auth.uid()
  );

CREATE POLICY api_keys_delete_owner_or_admin
  ON public.api_keys FOR DELETE TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    AND (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
  );

CREATE POLICY api_keys_update_owner_or_admin
  ON public.api_keys FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    AND (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
  )
  WITH CHECK (tenant_id = public.get_user_tenant_id());

-- ---- 7) fiscal_settings: SELECT admin-only
DROP POLICY IF EXISTS tenant_isolation_select_fiscal_settings ON public.fiscal_settings;
CREATE POLICY fiscal_settings_select_admin
  ON public.fiscal_settings FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- ---- 8) integrations: admin-only access (contains api_key/api_secret)
DROP POLICY IF EXISTS "Tenant isolation" ON public.integrations;
CREATE POLICY integrations_admin_only
  ON public.integrations FOR ALL TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- ---- 9) whatsapp_meta_connections: admin-only
DROP POLICY IF EXISTS meta_connections_tenant_isolation ON public.whatsapp_meta_connections;
CREATE POLICY meta_connections_admin_only
  ON public.whatsapp_meta_connections FOR ALL TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- ---- 10) whatsapp_settings: SELECT admin-only (contains evolution_api_key)
DROP POLICY IF EXISTS "Users can read whatsapp settings" ON public.whatsapp_settings;
CREATE POLICY whatsapp_settings_select_admin
  ON public.whatsapp_settings FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- ---- 11) Fix mutable search_path on create_payable_with_recurrence
ALTER FUNCTION public.create_payable_with_recurrence(
  uuid, text, numeric, date, uuid, uuid, text, integer, date, text, text
) SET search_path = public;

-- ---- 12) v_global_tenant_metrics: recreate as SECURITY INVOKER
DROP VIEW IF EXISTS public.v_global_tenant_metrics;
CREATE VIEW public.v_global_tenant_metrics
WITH (security_invoker = true) AS
SELECT
  t.id,
  t.name,
  t.is_active,
  t.suspended_at,
  t.suspended_reason,
  t.deleted_at,
  t.plan_name,
  t.created_at,
  (SELECT count(*) FROM public.profiles p WHERE p.tenant_id = t.id) AS user_count,
  (SELECT count(*) FROM public.profiles p WHERE p.tenant_id = t.id AND p.status = 'active') AS active_user_count
FROM public.tenants t;

GRANT SELECT ON public.v_global_tenant_metrics TO authenticated, service_role;
