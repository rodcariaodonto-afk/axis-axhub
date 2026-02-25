
-- Tenant-level tag definitions with colors for leads
CREATE TABLE public.lead_tag_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique name per tenant
CREATE UNIQUE INDEX lead_tag_definitions_tenant_name ON public.lead_tag_definitions(tenant_id, name);

-- RLS
ALTER TABLE public.lead_tag_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.lead_tag_definitions
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Junction table for lead <-> tag
CREATE TABLE public.lead_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.lead_tag_definitions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lead_id, tag_id)
);

ALTER TABLE public.lead_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.lead_tags
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
