
-- Table for contact tags
CREATE TABLE public.whatsapp_contact_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  contact_id UUID NOT NULL REFERENCES public.whatsapp_contacts(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  tag_color TEXT NOT NULL DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(contact_id, tag_name)
);

ALTER TABLE public.whatsapp_contact_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON public.whatsapp_contact_tags AS RESTRICTIVE FOR ALL
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- Table for contact status
CREATE TABLE public.whatsapp_contact_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  contact_id UUID NOT NULL REFERENCES public.whatsapp_contacts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open',
  assigned_to UUID NULL,
  last_status_change TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(contact_id)
);

ALTER TABLE public.whatsapp_contact_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON public.whatsapp_contact_status AS RESTRICTIVE FOR ALL
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- Add columns to whatsapp_contacts
ALTER TABLE public.whatsapp_contacts
  ADD COLUMN IF NOT EXISTS color_code TEXT,
  ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 0;

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_contact_tags;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_contact_status;
