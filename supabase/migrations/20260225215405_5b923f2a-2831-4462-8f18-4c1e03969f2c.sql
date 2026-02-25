
-- 1. Add trigger_types column to workflows (used by process-form-response to find matching workflows)
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS trigger_types text[] DEFAULT '{}';

-- 2. Update handle_new_user to create the native workflow for every new tenant
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  INSERT INTO public.warehouses (tenant_id, name, is_default) VALUES (new_tenant_id, 'Depósito Principal', true);

  INSERT INTO public.sales_pipelines (tenant_id, name, is_default) VALUES (new_tenant_id, 'Pipeline Padrão', true) RETURNING id INTO new_pipeline_id;
  INSERT INTO public.pipeline_stages (tenant_id, pipeline_id, name, "order", probability) VALUES
    (new_tenant_id, new_pipeline_id, 'Qualificação', 1, 10),
    (new_tenant_id, new_pipeline_id, 'Proposta', 2, 30),
    (new_tenant_id, new_pipeline_id, 'Negociação', 3, 60),
    (new_tenant_id, new_pipeline_id, 'Fechamento', 4, 90);

  PERFORM public.create_default_bi_dashboards(new_tenant_id, NEW.id);

  INSERT INTO public.opportunity_stages (tenant_id, name, order_index, color, is_won, is_lost) VALUES
    (new_tenant_id, 'Prospecting', 1, '#6B7280', false, false),
    (new_tenant_id, 'Qualification', 2, '#3B82F6', false, false),
    (new_tenant_id, 'Proposal', 3, '#8B5CF6', false, false),
    (new_tenant_id, 'Negotiation', 4, '#F59E0B', false, false),
    (new_tenant_id, 'Closed Won', 5, '#10B981', true, false),
    (new_tenant_id, 'Closed Lost', 6, '#EF4444', false, true);

  INSERT INTO public.activity_types (tenant_id, name, icon, color) VALUES
    (new_tenant_id, 'Call', 'Phone', '#3B82F6'),
    (new_tenant_id, 'Email', 'Mail', '#10B981'),
    (new_tenant_id, 'Meeting', 'Users', '#8B5CF6'),
    (new_tenant_id, 'Task', 'CheckSquare', '#F59E0B'),
    (new_tenant_id, 'Note', 'FileText', '#6B7280'),
    (new_tenant_id, 'WhatsApp', 'MessageCircle', '#25D366');

  -- Native workflow: Integração Formulários com CRM
  INSERT INTO public.workflows (tenant_id, name, description, created_by, is_active, trigger_types, definition)
  VALUES (
    new_tenant_id,
    'Integração Formulários com CRM',
    'Ao receber resposta de formulário, cria Lead, Conta, Contato, Oportunidade, envia e-mail e notificação interna automaticamente',
    NEW.id,
    true,
    ARRAY['form.submitted'],
    '{
      "nodes": [
        {"id": "n1", "type": "trigger", "catalogId": "form.submitted", "config": {}, "position": 0},
        {"id": "n2", "type": "action", "catalogId": "create_lead", "config": {"name": "{{respondent_name}}", "email": "{{respondent_email}}", "source": "Formulário"}, "position": 1},
        {"id": "n3", "type": "action", "catalogId": "create_account", "config": {"name": "{{institution_name}}", "segment": "Educação"}, "position": 2},
        {"id": "n4", "type": "action", "catalogId": "create_contact", "config": {"name": "{{respondent_name}}", "email": "{{respondent_email}}"}, "position": 3},
        {"id": "n5", "type": "action", "catalogId": "create_opportunity", "config": {"name": "Oportunidade - {{institution_name}}"}, "position": 4},
        {"id": "n6", "type": "action", "catalogId": "send_email", "config": {"to": "{{respondent_email}}", "subject": "Recebemos seu formulário", "body": "Olá {{respondent_name}},\n\nSeu formulário foi entregue e em breve entraremos em contato.\n\nObrigado!"}, "position": 5},
        {"id": "n7", "type": "action", "catalogId": "create_notification", "config": {"title": "Novo lead via formulário", "message": "Lead {{respondent_name}} criado automaticamente", "priority": "high"}, "position": 6}
      ],
      "edges": [
        {"source": "n1", "target": "n2"},
        {"source": "n2", "target": "n3"},
        {"source": "n3", "target": "n4"},
        {"source": "n4", "target": "n5"},
        {"source": "n5", "target": "n6"},
        {"source": "n6", "target": "n7"}
      ]
    }'::jsonb
  );

  RETURN NEW;
END;
$$;
