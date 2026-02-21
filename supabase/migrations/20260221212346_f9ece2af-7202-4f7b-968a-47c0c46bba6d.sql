
-- Evolucao da tabela integrations
ALTER TABLE public.integrations
  ADD COLUMN IF NOT EXISTS name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS slug VARCHAR(100),
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS icon_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'native',
  ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'productivity',
  ADD COLUMN IF NOT EXISTS auth_type VARCHAR(50) DEFAULT 'api_key',
  ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_configured BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by UUID;

-- Indice para slug por tenant
CREATE INDEX IF NOT EXISTS idx_integrations_tenant_slug ON public.integrations (tenant_id, slug);

-- Tabela integration_webhooks
CREATE TABLE public.integration_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  webhook_url TEXT NOT NULL,
  webhook_secret TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  events TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  failed_attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_webhook_url UNIQUE (webhook_url)
);

ALTER TABLE public.integration_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant read webhooks" ON public.integration_webhooks
  FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Admin insert webhooks" ON public.integration_webhooks
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin update webhooks" ON public.integration_webhooks
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin delete webhooks" ON public.integration_webhooks
  FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'));

CREATE INDEX idx_integration_webhooks_integration ON public.integration_webhooks (integration_id);

-- Tabela integration_logs
CREATE TABLE public.integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  event_type TEXT NOT NULL,
  action TEXT NOT NULL DEFAULT 'receive',
  request_payload JSONB DEFAULT '{}',
  response_payload JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant read logs" ON public.integration_logs
  FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "System insert logs" ON public.integration_logs
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE INDEX idx_integration_logs_integration ON public.integration_logs (integration_id);
CREATE INDEX idx_integration_logs_tenant_created ON public.integration_logs (tenant_id, created_at DESC);
CREATE INDEX idx_integration_logs_status ON public.integration_logs (status);

-- Tabela integration_mappings
CREATE TABLE public.integration_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  axhub_field TEXT NOT NULL,
  external_field TEXT NOT NULL,
  transform_type TEXT NOT NULL DEFAULT 'direct',
  transform_config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.integration_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant read mappings" ON public.integration_mappings
  FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Admin insert mappings" ON public.integration_mappings
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin update mappings" ON public.integration_mappings
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin delete mappings" ON public.integration_mappings
  FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'));

CREATE INDEX idx_integration_mappings_integration ON public.integration_mappings (integration_id);
