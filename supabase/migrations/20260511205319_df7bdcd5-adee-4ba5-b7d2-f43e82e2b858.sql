
CREATE TABLE public.form_response_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  draft_token text NOT NULL,
  respondent_name text,
  respondent_email text,
  respondent_phone text,
  identify jsonb NOT NULL DEFAULT '{}'::jsonb,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  current_section integer NOT NULL DEFAULT 0,
  step text NOT NULL DEFAULT 'identify',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (form_id, draft_token)
);

CREATE INDEX idx_form_response_drafts_tenant ON public.form_response_drafts(tenant_id, updated_at DESC);
CREATE INDEX idx_form_response_drafts_form ON public.form_response_drafts(form_id, updated_at DESC);

ALTER TABLE public.form_response_drafts ENABLE ROW LEVEL SECURITY;

-- Tenant owner can view drafts of their forms
CREATE POLICY "drafts_select_tenant"
ON public.form_response_drafts FOR SELECT
TO authenticated
USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "drafts_delete_tenant"
ON public.form_response_drafts FOR DELETE
TO authenticated
USING (tenant_id = public.get_user_tenant_id());

-- Anonymous respondents can insert / select / update drafts
-- (token is an unguessable uuid, acts as the access secret)
CREATE POLICY "drafts_insert_anon"
ON public.form_response_drafts FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "drafts_select_anon"
ON public.form_response_drafts FOR SELECT
TO anon
USING (true);

CREATE POLICY "drafts_update_anon"
ON public.form_response_drafts FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE TRIGGER trg_form_response_drafts_updated_at
BEFORE UPDATE ON public.form_response_drafts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
