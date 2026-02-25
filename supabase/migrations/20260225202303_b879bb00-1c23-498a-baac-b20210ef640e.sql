
-- 1. Tabela bi_form_data para analytics de formulários
CREATE TABLE public.bi_form_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  form_response_id UUID REFERENCES public.form_responses(id),
  form_id UUID REFERENCES public.forms(id),
  lead_id UUID REFERENCES public.leads(id),
  account_id UUID REFERENCES public.crm_accounts(id),
  opportunity_id UUID REFERENCES public.opportunities(id),
  institution_name TEXT,
  country TEXT,
  respondent_name TEXT,
  respondent_email TEXT,
  respondent_role TEXT,
  total_students INT,
  students_with_special_needs INT,
  special_needs_types TEXT[],
  has_inclusion_program BOOLEAN,
  investment_capacity TEXT,
  estimated_value NUMERIC DEFAULT 0,
  additional_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bi_form_data_tenant ON public.bi_form_data(tenant_id);
CREATE INDEX idx_bi_form_data_form ON public.bi_form_data(form_id);

ALTER TABLE public.bi_form_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bi_form_data_tenant_read" ON public.bi_form_data
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "bi_form_data_tenant_insert" ON public.bi_form_data
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "bi_form_data_service_insert" ON public.bi_form_data
  FOR INSERT TO service_role
  WITH CHECK (true);

-- 2. Trigger na form_responses para chamar a Edge Function via pg_net
CREATE OR REPLACE FUNCTION public.notify_form_response_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url', true) 
           || '/functions/v1/process-form-response',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object('form_response_id', NEW.id)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_form_response_created
  AFTER INSERT ON public.form_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_form_response_created();
