
-- 1. Create triggers for automatic data capture into fact_events
-- First ensure the trigger function exists and handles all tables
CREATE OR REPLACE FUNCTION public.handle_fact_events_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_type_id uuid;
  v_event_name text;
  v_value numeric := 0;
  v_quantity int := 1;
  v_metadata jsonb := '{}';
  v_user_id uuid;
  v_customer_id uuid;
BEGIN
  -- Determine event type based on source table
  CASE TG_TABLE_NAME
    WHEN 'deals' THEN
      v_event_name := CASE 
        WHEN TG_OP = 'INSERT' THEN 'deal_created'
        WHEN NEW.status = 'won' AND (OLD IS NULL OR OLD.status != 'won') THEN 'deal_won'
        WHEN NEW.status = 'lost' AND (OLD IS NULL OR OLD.status != 'lost') THEN 'deal_lost'
        ELSE 'deal_updated'
      END;
      v_value := COALESCE(NEW.estimated_value, 0);
      v_user_id := NEW.responsible_user_id;
      v_metadata := jsonb_build_object('deal_name', NEW.name, 'status', NEW.status, 'pipeline_id', NEW.pipeline_id);

    WHEN 'contacts' THEN
      v_event_name := CASE WHEN TG_OP = 'INSERT' THEN 'contact_created' ELSE 'contact_updated' END;
      v_metadata := jsonb_build_object('contact_name', NEW.first_name || ' ' || COALESCE(NEW.last_name, ''));

    WHEN 'leads' THEN
      v_event_name := CASE WHEN TG_OP = 'INSERT' THEN 'lead_created' ELSE 'lead_updated' END;
      v_value := COALESCE(NEW.estimated_value, 0);
      v_user_id := NEW.owner_user_id;
      v_metadata := jsonb_build_object('lead_name', NEW.name, 'status', NEW.status);

    WHEN 'receivables' THEN
      v_event_name := CASE WHEN TG_OP = 'INSERT' THEN 'receivable_created' ELSE 'receivable_updated' END;
      v_value := COALESCE(NEW.amount, 0);
      v_metadata := jsonb_build_object('description', NEW.description, 'status', NEW.status, 'due_date', NEW.due_date);

    WHEN 'payables' THEN
      v_event_name := CASE WHEN TG_OP = 'INSERT' THEN 'payable_created' ELSE 'payable_updated' END;
      v_value := COALESCE(NEW.amount, 0);
      v_metadata := jsonb_build_object('description', NEW.description, 'status', NEW.status, 'due_date', NEW.due_date);

    WHEN 'whatsapp_messages' THEN
      v_event_name := 'whatsapp_message_received';
      v_metadata := jsonb_build_object('direction', NEW.direction, 'session_id', NEW.session_id);

    WHEN 'orders' THEN
      v_event_name := CASE WHEN TG_OP = 'INSERT' THEN 'order_created' ELSE 'order_updated' END;
      v_value := COALESCE(NEW.total, 0);
      v_metadata := jsonb_build_object('status', NEW.status);

    ELSE
      RETURN NEW;
  END CASE;

  -- Find or create event type
  SELECT id INTO v_event_type_id
  FROM dim_event_types
  WHERE tenant_id = NEW.tenant_id AND name = v_event_name;

  IF v_event_type_id IS NULL THEN
    INSERT INTO dim_event_types (tenant_id, name, category)
    VALUES (NEW.tenant_id, v_event_name, TG_TABLE_NAME)
    RETURNING id INTO v_event_type_id;
  END IF;

  -- Insert fact event
  INSERT INTO fact_events (tenant_id, event_type_id, event_timestamp, value, quantity, metadata, user_id)
  VALUES (NEW.tenant_id, v_event_type_id, now(), v_value, v_quantity, v_metadata, v_user_id);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't block the original operation if BI capture fails
  RETURN NEW;
END;
$$;

-- Create triggers for all tables
DROP TRIGGER IF EXISTS trg_fact_events_deals ON deals;
CREATE TRIGGER trg_fact_events_deals
  AFTER INSERT OR UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION handle_fact_events_trigger();

DROP TRIGGER IF EXISTS trg_fact_events_contacts ON contacts;
CREATE TRIGGER trg_fact_events_contacts
  AFTER INSERT OR UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION handle_fact_events_trigger();

DROP TRIGGER IF EXISTS trg_fact_events_leads ON leads;
CREATE TRIGGER trg_fact_events_leads
  AFTER INSERT OR UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION handle_fact_events_trigger();

DROP TRIGGER IF EXISTS trg_fact_events_receivables ON receivables;
CREATE TRIGGER trg_fact_events_receivables
  AFTER INSERT OR UPDATE ON receivables
  FOR EACH ROW EXECUTE FUNCTION handle_fact_events_trigger();

DROP TRIGGER IF EXISTS trg_fact_events_payables ON payables;
CREATE TRIGGER trg_fact_events_payables
  AFTER INSERT OR UPDATE ON payables
  FOR EACH ROW EXECUTE FUNCTION handle_fact_events_trigger();

DROP TRIGGER IF EXISTS trg_fact_events_whatsapp ON whatsapp_messages;
CREATE TRIGGER trg_fact_events_whatsapp
  AFTER INSERT ON whatsapp_messages
  FOR EACH ROW EXECUTE FUNCTION handle_fact_events_trigger();

DROP TRIGGER IF EXISTS trg_fact_events_orders ON orders;
CREATE TRIGGER trg_fact_events_orders
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION handle_fact_events_trigger();

-- 2. Expand create_default_bi_dashboards to create 4 dashboards
CREATE OR REPLACE FUNCTION public.create_default_bi_dashboards(p_tenant_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dash_id uuid;
  v_count int;
BEGIN
  -- Check if dashboards already exist for this tenant
  SELECT count(*) INTO v_count FROM bi_dashboards WHERE tenant_id = p_tenant_id;
  IF v_count > 0 THEN
    RETURN;
  END IF;

  -- 1. Visão Geral (default)
  INSERT INTO bi_dashboards (tenant_id, created_by, name, description, is_default)
  VALUES (p_tenant_id, p_user_id, 'Visão Geral', 'Dashboard principal com métricas gerais', true)
  RETURNING id INTO v_dash_id;

  INSERT INTO bi_widgets (tenant_id, dashboard_id, title, chart_type, metric, dimension, aggregation) VALUES
    (p_tenant_id, v_dash_id, 'Receita Total', 'kpi', 'value', 'event_type', 'sum'),
    (p_tenant_id, v_dash_id, 'Novos Contatos', 'kpi', 'count', 'event_type', 'count'),
    (p_tenant_id, v_dash_id, 'Eventos por Mês', 'bar', 'count', 'month', 'count'),
    (p_tenant_id, v_dash_id, 'Receita por Mês', 'line', 'value', 'month', 'sum');

  -- 2. Análise de CRM
  INSERT INTO bi_dashboards (tenant_id, created_by, name, description)
  VALUES (p_tenant_id, p_user_id, 'Análise de CRM', 'Métricas de vendas e pipeline')
  RETURNING id INTO v_dash_id;

  INSERT INTO bi_widgets (tenant_id, dashboard_id, title, chart_type, metric, dimension, aggregation) VALUES
    (p_tenant_id, v_dash_id, 'Negócios Ganhos', 'kpi', 'value', 'event_type', 'sum'),
    (p_tenant_id, v_dash_id, 'Taxa de Conversão', 'kpi', 'count', 'event_type', 'count'),
    (p_tenant_id, v_dash_id, 'Vendas por Vendedor', 'bar', 'value', 'user', 'sum');

  -- 3. Análise de ERP
  INSERT INTO bi_dashboards (tenant_id, created_by, name, description)
  VALUES (p_tenant_id, p_user_id, 'Análise de ERP', 'Métricas financeiras e fluxo de caixa')
  RETURNING id INTO v_dash_id;

  INSERT INTO bi_widgets (tenant_id, dashboard_id, title, chart_type, metric, dimension, aggregation) VALUES
    (p_tenant_id, v_dash_id, 'Fluxo de Caixa', 'line', 'value', 'month', 'sum'),
    (p_tenant_id, v_dash_id, 'Contas a Receber vs Pagar', 'bar', 'value', 'event_type', 'sum');

  -- 4. Análise de WhatsApp
  INSERT INTO bi_dashboards (tenant_id, created_by, name, description)
  VALUES (p_tenant_id, p_user_id, 'Análise de WhatsApp', 'Métricas de atendimento via WhatsApp')
  RETURNING id INTO v_dash_id;

  INSERT INTO bi_widgets (tenant_id, dashboard_id, title, chart_type, metric, dimension, aggregation) VALUES
    (p_tenant_id, v_dash_id, 'Mensagens Recebidas', 'kpi', 'count', 'event_type', 'count'),
    (p_tenant_id, v_dash_id, 'Conversas por Atendente', 'bar', 'count', 'user', 'count');
END;
$$;
