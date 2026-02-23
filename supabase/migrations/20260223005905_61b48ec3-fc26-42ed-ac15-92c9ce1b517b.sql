
-- Add default BI dashboards creation to handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_tenant_id uuid;
  new_pipeline_id uuid;
BEGIN
  INSERT INTO public.tenants (name) 
  VALUES (COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  RETURNING id INTO new_tenant_id;

  INSERT INTO public.profiles (id, tenant_id, full_name, email)
  VALUES (NEW.id, new_tenant_id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');

  -- Create default warehouse
  INSERT INTO public.warehouses (tenant_id, name, is_default) VALUES (new_tenant_id, 'Depósito Principal', true);

  -- Create default sales pipeline
  INSERT INTO public.sales_pipelines (tenant_id, name, is_default) VALUES (new_tenant_id, 'Pipeline Padrão', true) RETURNING id INTO new_pipeline_id;
  INSERT INTO public.pipeline_stages (tenant_id, pipeline_id, name, "order", probability) VALUES
    (new_tenant_id, new_pipeline_id, 'Qualificação', 1, 10),
    (new_tenant_id, new_pipeline_id, 'Proposta', 2, 30),
    (new_tenant_id, new_pipeline_id, 'Negociação', 3, 60),
    (new_tenant_id, new_pipeline_id, 'Fechamento', 4, 90);

  -- Create default BI dashboards
  PERFORM public.create_default_bi_dashboards(new_tenant_id, NEW.id);

  RETURN NEW;
END;
$function$;
