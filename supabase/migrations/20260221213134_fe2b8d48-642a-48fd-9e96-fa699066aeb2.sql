
-- Reports table
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  template_id VARCHAR(100),
  config JSONB NOT NULL DEFAULT '{}',
  data JSONB,
  chart_type VARCHAR(50) DEFAULT 'bar',
  is_public BOOLEAN DEFAULT false,
  shared_with JSONB DEFAULT '[]',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own or public reports"
ON public.reports FOR SELECT
USING (
  tenant_id = get_user_tenant_id()
  AND (created_by = auth.uid() OR is_public = true)
);

CREATE POLICY "Users can insert own reports"
ON public.reports FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id() AND created_by = auth.uid());

CREATE POLICY "Users can update own reports"
ON public.reports FOR UPDATE
USING (tenant_id = get_user_tenant_id() AND created_by = auth.uid());

CREATE POLICY "Users can delete own reports"
ON public.reports FOR DELETE
USING (tenant_id = get_user_tenant_id() AND created_by = auth.uid());

CREATE INDEX idx_reports_tenant ON public.reports(tenant_id);
CREATE INDEX idx_reports_template ON public.reports(template_id);
CREATE INDEX idx_reports_created_by ON public.reports(created_by);

CREATE TRIGGER update_reports_updated_at
BEFORE UPDATE ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Report exports table
CREATE TABLE public.report_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  format VARCHAR(20) NOT NULL,
  file_url TEXT,
  file_size BIGINT,
  status VARCHAR(20) DEFAULT 'pending',
  error_message TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.report_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own exports"
ON public.report_exports FOR SELECT
USING (tenant_id = get_user_tenant_id() AND created_by = auth.uid());

CREATE POLICY "Users can insert own exports"
ON public.report_exports FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id() AND created_by = auth.uid());

CREATE INDEX idx_report_exports_report ON public.report_exports(report_id);
CREATE INDEX idx_report_exports_tenant ON public.report_exports(tenant_id);

-- Report schedules table (future use)
CREATE TABLE public.report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  frequency VARCHAR(20) NOT NULL DEFAULT 'weekly',
  day_of_week INTEGER,
  day_of_month INTEGER,
  time_of_day TIME DEFAULT '08:00',
  recipients TEXT[] DEFAULT '{}',
  format VARCHAR(20) DEFAULT 'pdf',
  is_active BOOLEAN DEFAULT false,
  last_sent_at TIMESTAMPTZ,
  next_send_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.report_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for schedules"
ON public.report_schedules FOR ALL
USING (tenant_id = get_user_tenant_id())
WITH CHECK (tenant_id = get_user_tenant_id());

CREATE INDEX idx_report_schedules_report ON public.report_schedules(report_id);
