
-- Fix RLS: add policies for tables with RLS enabled but no policy
-- workflow_waiting_states: tenant users can view their own; writes via service role only
CREATE POLICY "workflow_waiting_states_tenant_select"
ON public.workflow_waiting_states FOR SELECT TO authenticated
USING (tenant_id = public.get_user_tenant_id());

-- axis_landing_leads: anonymous insert (landing page), only super admins read
CREATE POLICY "axis_landing_leads_anon_insert"
ON public.axis_landing_leads FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "axis_landing_leads_super_admin_select"
ON public.axis_landing_leads FOR SELECT TO authenticated
USING (public.is_super_admin());

GRANT INSERT ON public.axis_landing_leads TO anon;

-- Tighten always-true policy on bi_form_data: restrict to service role only by dropping the policy
-- (service_role bypasses RLS, so the explicit "true" insert policy is unnecessary)
DROP POLICY IF EXISTS bi_form_data_service_insert ON public.bi_form_data;

-- Tighten form_responses insert policies: keep insert open (forms are public) but require tenant_id to match a published form
-- Replace blanket "true" with a stricter check
DROP POLICY IF EXISTS form_responses_insert_anon ON public.form_responses;
DROP POLICY IF EXISTS form_responses_insert_auth ON public.form_responses;

CREATE POLICY "form_responses_insert_public"
ON public.form_responses FOR INSERT TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.forms f
    WHERE f.id = form_responses.form_id
      AND f.tenant_id = form_responses.tenant_id
      AND f.status = 'published'
  )
);

-- Fix function search_path warnings
ALTER FUNCTION public.calculate_next_recurrence_date(date, text, integer) SET search_path = public;
ALTER FUNCTION public.update_fiscal_updated_at() SET search_path = public;

-- Revoke EXECUTE on internal SECURITY DEFINER functions from anon
-- (These are only called from server-side / triggers / RLS contexts, not directly by anonymous clients)
REVOKE EXECUTE ON FUNCTION public.handle_fact_events_trigger() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.sync_contact_to_customer() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_form_response_created() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.create_default_bi_dashboards(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.count_leads_by_source() FROM anon;
REVOKE EXECUTE ON FUNCTION public.count_leads_by_status() FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_payable_with_recurrence(uuid, text, numeric, date, uuid, uuid, text, integer, date, text, text) FROM anon;
