
-- Add missing columns to existing tables
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS channel text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.crm_accounts ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Messages Timeline
CREATE TABLE public.messages_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  channel text NOT NULL DEFAULT 'email',
  contact_id uuid REFERENCES public.contacts(id),
  direction text NOT NULL DEFAULT 'outbound',
  content text NOT NULL,
  attachments_json jsonb,
  raw_json jsonb,
  synced_from text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.messages_timeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.messages_timeline AS RESTRICTIVE FOR ALL
  USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());

-- Proposals
CREATE TABLE public.proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  deal_id uuid REFERENCES public.deals(id),
  number text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  pdf_url text,
  total_amount numeric NOT NULL DEFAULT 0,
  valid_until date,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.proposals AS RESTRICTIVE FOR ALL
  USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());

-- Lead Scoring Rules
CREATE TABLE public.lead_scoring_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  criteria text NOT NULL,
  points integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lead_scoring_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.lead_scoring_rules AS RESTRICTIVE FOR ALL
  USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());

-- Email Templates
CREATE TABLE public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  name text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  variables text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.email_templates AS RESTRICTIVE FOR ALL
  USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());

-- Sales Cadences
CREATE TABLE public.sales_cadences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sales_cadences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.sales_cadences AS RESTRICTIVE FOR ALL
  USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());

-- Cadence Steps
CREATE TABLE public.cadence_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  cadence_id uuid NOT NULL REFERENCES public.sales_cadences(id) ON DELETE CASCADE,
  step_number integer NOT NULL DEFAULT 1,
  type text NOT NULL DEFAULT 'email',
  delay_days integer NOT NULL DEFAULT 1,
  email_template_id uuid REFERENCES public.email_templates(id),
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cadence_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.cadence_steps AS RESTRICTIVE FOR ALL
  USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());

-- Deal Forecasts
CREATE TABLE public.deal_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  user_id uuid NOT NULL,
  period text NOT NULL,
  forecast_amount numeric NOT NULL DEFAULT 0,
  committed_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.deal_forecasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.deal_forecasts AS RESTRICTIVE FOR ALL
  USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());

-- Event Outbox (for N8N webhooks)
CREATE TABLE public.event_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  event_name text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  actor_user_id uuid,
  status text NOT NULL DEFAULT 'pending',
  retry_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
ALTER TABLE public.event_outbox ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.event_outbox AS RESTRICTIVE FOR ALL
  USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());
