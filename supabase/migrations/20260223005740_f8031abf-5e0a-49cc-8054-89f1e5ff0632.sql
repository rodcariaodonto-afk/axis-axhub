
-- 1. Função genérica para registro automático de eventos na fact_events
CREATE OR REPLACE FUNCTION public.handle_fact_events_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_event_type_id UUID;
  v_tenant_id UUID;
  v_value NUMERIC := 0;
  v_quantity INTEGER := 1;
  v_customer_id UUID;
  v_product_id UUID;
  v_user_id UUID;
  v_event_name TEXT;
  v_metadata JSONB := '{}'::jsonb;
BEGIN
  v_event_name := TG_TABLE_NAME || '_' || lower(TG_OP);

  -- Tenant ID from the row
  IF TG_OP = 'DELETE' THEN
    v_tenant_id := OLD.tenant_id;
  ELSE
    v_tenant_id := NEW.tenant_id;
  END IF;

  -- Get or create event type
  SELECT id INTO v_event_type_id FROM public.dim_event_types
    WHERE name = v_event_name AND tenant_id = v_tenant_id;

  IF v_event_type_id IS NULL THEN
    INSERT INTO public.dim_event_types (name, category, tenant_id)
    VALUES (v_event_name, TG_TABLE_NAME, v_tenant_id)
    RETURNING id INTO v_event_type_id;
  END IF;

  -- Extract common fields based on table
  IF TG_TABLE_NAME = 'deals' THEN
    v_value := COALESCE(NEW.estimated_value, 0);
    v_user_id := NEW.responsible_user_id;
    v_customer_id := NEW.contact_id;
    v_metadata := jsonb_build_object('status', NEW.status, 'stage_id', NEW.stage_id);
  ELSIF TG_TABLE_NAME = 'contacts' THEN
    v_user_id := NULL;
    v_metadata := jsonb_build_object('name', NEW.first_name);
  ELSIF TG_TABLE_NAME = 'leads' THEN
    v_user_id := NEW.owner_user_id;
    v_value := COALESCE(NEW.estimated_value, 0);
    v_metadata := jsonb_build_object('status', NEW.status);
  ELSIF TG_TABLE_NAME = 'receivables' THEN
    v_value := COALESCE(NEW.amount, 0);
    v_customer_id := NEW.customer_id;
    v_metadata := jsonb_build_object('status', NEW.status);
  ELSIF TG_TABLE_NAME = 'payables' THEN
    v_value := COALESCE(NEW.amount, 0);
    v_metadata := jsonb_build_object('status', NEW.status);
  ELSIF TG_TABLE_NAME = 'whatsapp_messages' THEN
    v_metadata := jsonb_build_object('direction', NEW.direction);
  ELSIF TG_TABLE_NAME = 'orders' THEN
    v_value := COALESCE(NEW.total, 0);
    v_customer_id := NEW.customer_id;
    v_metadata := jsonb_build_object('status', NEW.status);
  END IF;

  INSERT INTO public.fact_events (
    tenant_id, event_type_id, user_id, customer_id, product_id,
    value, quantity, metadata, event_timestamp
  ) VALUES (
    v_tenant_id, v_event_type_id, v_user_id, v_customer_id, v_product_id,
    v_value, v_quantity, v_metadata, now()
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Triggers nas tabelas existentes
CREATE TRIGGER bi_deals_capture AFTER INSERT OR UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.handle_fact_events_trigger();

CREATE TRIGGER bi_contacts_capture AFTER INSERT ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.handle_fact_events_trigger();

-- 3. Tabela de ajustes manuais
CREATE TABLE public.bi_manual_adjustments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  event_type TEXT NOT NULL,
  adjustment_date DATE NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  widget_id UUID REFERENCES public.bi_widgets(id) ON DELETE SET NULL
);

ALTER TABLE public.bi_manual_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON public.bi_manual_adjustments
  FOR ALL USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- 4. Atualizar a função de consulta para incluir ajustes manuais
CREATE OR REPLACE FUNCTION public.execute_bi_widget_query(
  p_metric TEXT,
  p_dimension TEXT,
  p_aggregation TEXT DEFAULT 'sum',
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE(label TEXT, value NUMERIC) AS $$
BEGIN
  RETURN QUERY
  WITH base_data AS (
    -- Dados automáticos da fact_events
    SELECT
      CASE p_dimension
        WHEN 'event_type' THEN COALESCE(det.name, 'Sem tipo')
        WHEN 'customer' THEN COALESCE(dc.name, 'Sem cliente')
        WHEN 'product' THEN COALESCE(dp.name, 'Sem produto')
        WHEN 'month' THEN to_char(fe.event_timestamp, 'YYYY-MM')
        WHEN 'week' THEN to_char(fe.event_timestamp, 'IYYY-IW')
        WHEN 'day' THEN to_char(fe.event_timestamp, 'YYYY-MM-DD')
        ELSE 'Total'
      END AS dim_label,
      CASE p_metric
        WHEN 'value' THEN COALESCE(fe.value, 0)
        WHEN 'quantity' THEN COALESCE(fe.quantity, 0)::NUMERIC
        WHEN 'count' THEN 1
        ELSE COALESCE(fe.value, 0)
      END AS metric_value
    FROM public.fact_events fe
    LEFT JOIN public.dim_event_types det ON fe.event_type_id = det.id
    LEFT JOIN public.dim_customers dc ON fe.customer_id = dc.id
    LEFT JOIN public.dim_products dp ON fe.product_id = dp.id
    WHERE fe.tenant_id = get_user_tenant_id()
      AND (p_date_from IS NULL OR fe.event_timestamp >= p_date_from)
      AND (p_date_to IS NULL OR fe.event_timestamp <= p_date_to)

    UNION ALL

    -- Dados de ajustes manuais
    SELECT
      CASE p_dimension
        WHEN 'event_type' THEN COALESCE(ma.event_type, 'Ajuste Manual')
        WHEN 'month' THEN to_char(ma.adjustment_date, 'YYYY-MM')
        WHEN 'week' THEN to_char(ma.adjustment_date, 'IYYY-IW')
        WHEN 'day' THEN to_char(ma.adjustment_date, 'YYYY-MM-DD')
        ELSE 'Ajuste Manual'
      END AS dim_label,
      ma.value AS metric_value
    FROM public.bi_manual_adjustments ma
    WHERE ma.tenant_id = get_user_tenant_id()
      AND (p_date_from IS NULL OR ma.adjustment_date >= p_date_from::date)
      AND (p_date_to IS NULL OR ma.adjustment_date <= p_date_to::date)
  )
  SELECT
    bd.dim_label AS label,
    CASE p_aggregation
      WHEN 'sum' THEN SUM(bd.metric_value)
      WHEN 'count' THEN COUNT(*)::NUMERIC
      WHEN 'avg' THEN AVG(bd.metric_value)
      WHEN 'min' THEN MIN(bd.metric_value)
      WHEN 'max' THEN MAX(bd.metric_value)
      ELSE SUM(bd.metric_value)
    END AS value
  FROM base_data bd
  GROUP BY bd.dim_label
  ORDER BY value DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Função para criar dashboards padrão para novos tenants
CREATE OR REPLACE FUNCTION public.create_default_bi_dashboards(p_tenant_id UUID, p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_dash_geral UUID;
  v_dash_crm UUID;
BEGIN
  -- Dashboard Visão Geral
  INSERT INTO public.bi_dashboards (name, description, tenant_id, created_by, is_default)
  VALUES ('Visão Geral', 'Dashboard principal com métricas gerais', p_tenant_id, p_user_id, true)
  RETURNING id INTO v_dash_geral;

  INSERT INTO public.bi_widgets (dashboard_id, tenant_id, title, chart_type, metric, dimension, aggregation) VALUES
    (v_dash_geral, p_tenant_id, 'Receita Total', 'kpi', 'value', 'event_type', 'sum'),
    (v_dash_geral, p_tenant_id, 'Novos Contatos', 'kpi', 'count', 'event_type', 'count'),
    (v_dash_geral, p_tenant_id, 'Eventos por Mês', 'bar', 'count', 'month', 'count'),
    (v_dash_geral, p_tenant_id, 'Receita por Mês', 'line', 'value', 'month', 'sum');

  -- Dashboard CRM
  INSERT INTO public.bi_dashboards (name, description, tenant_id, created_by)
  VALUES ('Análise de CRM', 'Métricas do funil de vendas e leads', p_tenant_id, p_user_id)
  RETURNING id INTO v_dash_crm;

  INSERT INTO public.bi_widgets (dashboard_id, tenant_id, title, chart_type, metric, dimension, aggregation) VALUES
    (v_dash_crm, p_tenant_id, 'Deals por Status', 'pie', 'count', 'event_type', 'count'),
    (v_dash_crm, p_tenant_id, 'Valor por Dia', 'line', 'value', 'day', 'sum');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
