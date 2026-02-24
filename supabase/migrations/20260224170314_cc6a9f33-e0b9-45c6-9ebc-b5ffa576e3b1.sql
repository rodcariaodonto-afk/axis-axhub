
-- Colunas de rastreamento de conversao em leads
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS converted_to_account_id uuid REFERENCES public.crm_accounts(id),
  ADD COLUMN IF NOT EXISTS converted_to_contact_id uuid REFERENCES public.contacts(id);

-- Custom fields generico
CREATE TABLE public.custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  object_name text NOT NULL,
  field_name text NOT NULL,
  field_type text NOT NULL DEFAULT 'text',
  field_label text NOT NULL,
  is_required boolean DEFAULT false,
  picklist_values jsonb,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, object_name, field_name)
);

CREATE TABLE public.custom_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  custom_field_id uuid NOT NULL REFERENCES public.custom_fields(id) ON DELETE CASCADE,
  record_id uuid NOT NULL,
  value text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(custom_field_id, record_id)
);

ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.custom_fields FOR ALL
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

ALTER TABLE public.custom_field_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.custom_field_values FOR ALL
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- Soft delete para profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Indices de performance
CREATE INDEX IF NOT EXISTS idx_custom_fields_object ON public.custom_fields(tenant_id, object_name);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_record ON public.custom_field_values(record_id);
CREATE INDEX IF NOT EXISTS idx_leads_converted ON public.leads(converted_to_account_id);
