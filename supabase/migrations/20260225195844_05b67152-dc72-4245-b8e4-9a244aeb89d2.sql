
-- Table: forms
CREATE TABLE public.forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  form_config JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  unique_code TEXT NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: form_responses
CREATE TABLE public.form_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  respondent_name TEXT NOT NULL,
  respondent_email TEXT NOT NULL,
  response_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE UNIQUE INDEX forms_unique_code_idx ON public.forms(unique_code);
CREATE INDEX forms_tenant_id_idx ON public.forms(tenant_id);
CREATE INDEX form_responses_form_id_idx ON public.form_responses(form_id);
CREATE INDEX form_responses_tenant_id_idx ON public.form_responses(tenant_id);

-- Updated_at trigger
CREATE TRIGGER update_forms_updated_at BEFORE UPDATE ON public.forms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_form_responses_updated_at BEFORE UPDATE ON public.form_responses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;

-- Forms policies: authenticated users can CRUD their tenant's forms
CREATE POLICY "forms_select" ON public.forms FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "forms_insert" ON public.forms FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "forms_update" ON public.forms FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "forms_delete" ON public.forms FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id());

-- Public read access for forms (for public form page by unique_code)
CREATE POLICY "forms_public_read" ON public.forms FOR SELECT TO anon
  USING (status = 'published');

-- Form responses: authenticated users can read their tenant's responses
CREATE POLICY "form_responses_select" ON public.form_responses FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "form_responses_delete" ON public.form_responses FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id());

-- Anyone can insert responses (public form submission)
CREATE POLICY "form_responses_insert_anon" ON public.form_responses FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "form_responses_insert_auth" ON public.form_responses FOR INSERT TO authenticated
  WITH CHECK (true);
