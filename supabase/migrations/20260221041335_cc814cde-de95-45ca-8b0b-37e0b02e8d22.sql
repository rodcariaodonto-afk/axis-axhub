
-- Custom fields for products
CREATE TABLE public.product_custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  field_name text NOT NULL,
  field_type text NOT NULL DEFAULT 'text',
  options text[] DEFAULT '{}',
  is_required boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.product_custom_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON public.product_custom_fields AS RESTRICTIVE FOR ALL
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- Custom field values per product
CREATE TABLE public.product_custom_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  field_id uuid NOT NULL REFERENCES public.product_custom_fields(id) ON DELETE CASCADE,
  value text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.product_custom_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON public.product_custom_values AS RESTRICTIVE FOR ALL
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- Unique constraint to prevent duplicate field values per product
CREATE UNIQUE INDEX idx_product_custom_values_unique ON public.product_custom_values (product_id, field_id);
