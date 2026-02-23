
-- =============================================
-- BI Module: Dimension tables, fact table, dashboards, widgets, alerts
-- =============================================

-- 1. dim_event_types
CREATE TABLE public.dim_event_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.dim_event_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.dim_event_types FOR ALL
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- 2. dim_customers
CREATE TABLE public.dim_customers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  customer_id uuid REFERENCES public.customers(id),
  name text NOT NULL,
  segment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.dim_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.dim_customers FOR ALL
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- 3. dim_products
CREATE TABLE public.dim_products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  product_id uuid,
  name text NOT NULL,
  category text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.dim_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.dim_products FOR ALL
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- 4. fact_events (central fact table)
CREATE TABLE public.fact_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  event_type_id uuid REFERENCES public.dim_event_types(id),
  user_id uuid,
  customer_id uuid REFERENCES public.dim_customers(id),
  product_id uuid REFERENCES public.dim_products(id),
  value numeric DEFAULT 0,
  quantity integer DEFAULT 1,
  metadata jsonb DEFAULT '{}'::jsonb,
  event_timestamp timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fact_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.fact_events FOR ALL
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- Performance indexes
CREATE INDEX idx_fact_events_tenant_timestamp ON public.fact_events (tenant_id, event_timestamp DESC);
CREATE INDEX idx_fact_events_type ON public.fact_events (event_type_id);
CREATE INDEX idx_fact_events_customer ON public.fact_events (customer_id);
CREATE INDEX idx_fact_events_product ON public.fact_events (product_id);

-- 5. bi_dashboards
CREATE TABLE public.bi_dashboards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  name text NOT NULL,
  description text,
  is_default boolean DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bi_dashboards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.bi_dashboards FOR ALL
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE TRIGGER update_bi_dashboards_updated_at
  BEFORE UPDATE ON public.bi_dashboards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. bi_widgets
CREATE TABLE public.bi_widgets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  dashboard_id uuid NOT NULL REFERENCES public.bi_dashboards(id) ON DELETE CASCADE,
  title text NOT NULL,
  chart_type text NOT NULL DEFAULT 'bar',
  metric text NOT NULL DEFAULT 'count',
  dimension text DEFAULT 'event_type',
  aggregation text DEFAULT 'sum',
  filters jsonb DEFAULT '{}'::jsonb,
  layout_config jsonb DEFAULT '{"col": 1, "row": 1, "width": 1, "height": 1}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bi_widgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.bi_widgets FOR ALL
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE TRIGGER update_bi_widgets_updated_at
  BEFORE UPDATE ON public.bi_widgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. bi_alerts
CREATE TABLE public.bi_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  widget_id uuid NOT NULL REFERENCES public.bi_widgets(id) ON DELETE CASCADE,
  name text NOT NULL,
  condition text NOT NULL DEFAULT 'gt',
  threshold numeric NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bi_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.bi_alerts FOR ALL
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- 8. bi_alert_logs
CREATE TABLE public.bi_alert_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  alert_id uuid NOT NULL REFERENCES public.bi_alerts(id) ON DELETE CASCADE,
  triggered_value numeric NOT NULL,
  threshold numeric NOT NULL,
  condition text NOT NULL,
  triggered_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bi_alert_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.bi_alert_logs FOR ALL
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- 9. SQL function for widget queries (safe, parameterized)
CREATE OR REPLACE FUNCTION public.execute_bi_widget_query(
  p_metric text,
  p_dimension text,
  p_aggregation text,
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL,
  p_filters jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  v_tenant_id uuid;
  v_agg text;
  v_dim text;
  v_metric text;
  query text;
BEGIN
  v_tenant_id := get_user_tenant_id();
  IF v_tenant_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  -- Whitelist aggregation
  IF p_aggregation NOT IN ('sum', 'count', 'avg', 'min', 'max') THEN
    v_agg := 'count';
  ELSE
    v_agg := p_aggregation;
  END IF;

  -- Whitelist dimension
  IF p_dimension NOT IN ('event_type', 'customer', 'product', 'month', 'week', 'day') THEN
    v_dim := 'event_type';
  ELSE
    v_dim := p_dimension;
  END IF;

  -- Whitelist metric
  IF p_metric NOT IN ('value', 'quantity', 'count') THEN
    v_metric := 'count';
  ELSE
    v_metric := p_metric;
  END IF;

  -- Build dimension expression
  DECLARE
    dim_expr text;
    dim_alias text;
  BEGIN
    CASE v_dim
      WHEN 'event_type' THEN
        dim_expr := 'COALESCE(det.name, ''Sem tipo'')';
        dim_alias := 'label';
      WHEN 'customer' THEN
        dim_expr := 'COALESCE(dc.name, ''Sem cliente'')';
        dim_alias := 'label';
      WHEN 'product' THEN
        dim_expr := 'COALESCE(dp.name, ''Sem produto'')';
        dim_alias := 'label';
      WHEN 'month' THEN
        dim_expr := 'to_char(fe.event_timestamp, ''YYYY-MM'')';
        dim_alias := 'label';
      WHEN 'week' THEN
        dim_expr := 'to_char(fe.event_timestamp, ''IYYY-IW'')';
        dim_alias := 'label';
      WHEN 'day' THEN
        dim_expr := 'to_char(fe.event_timestamp, ''YYYY-MM-DD'')';
        dim_alias := 'label';
    END CASE;

    -- Build metric expression
    DECLARE
      metric_expr text;
    BEGIN
      IF v_metric = 'count' THEN
        metric_expr := 'count(*)';
      ELSE
        metric_expr := v_agg || '(fe.' || v_metric || ')';
      END IF;

      query := 'SELECT json_agg(row_to_json(t)) FROM ('
        || 'SELECT ' || dim_expr || ' AS ' || dim_alias || ', '
        || metric_expr || ' AS value '
        || 'FROM public.fact_events fe '
        || 'LEFT JOIN public.dim_event_types det ON fe.event_type_id = det.id '
        || 'LEFT JOIN public.dim_customers dc ON fe.customer_id = dc.id '
        || 'LEFT JOIN public.dim_products dp ON fe.product_id = dp.id '
        || 'WHERE fe.tenant_id = $1';

      IF p_date_from IS NOT NULL THEN
        query := query || ' AND fe.event_timestamp >= $2';
      END IF;
      IF p_date_to IS NOT NULL THEN
        query := query || ' AND fe.event_timestamp <= $3';
      END IF;

      query := query || ' GROUP BY ' || dim_expr
        || ' ORDER BY value DESC LIMIT 50) t';

      EXECUTE query INTO result USING v_tenant_id, p_date_from, p_date_to;
    END;
  END;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;
