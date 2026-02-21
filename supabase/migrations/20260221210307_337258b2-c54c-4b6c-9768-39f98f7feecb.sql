
-- Tabela category_templates (templates pre-definidos, globais sem tenant_id)
CREATE TABLE public.category_templates (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  icon text,
  product_type text NOT NULL DEFAULT 'produto',
  sku_required boolean DEFAULT false,
  track_inventory boolean DEFAULT true,
  allowed_variations text[] DEFAULT ARRAY[]::text[],
  custom_fields jsonb DEFAULT '{}'::jsonb,
  niche text,
  is_popular boolean DEFAULT false,
  usage_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_category_templates_niche ON public.category_templates(niche);

-- RLS para templates (leitura publica para todos autenticados)
ALTER TABLE public.category_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read templates" ON public.category_templates FOR SELECT
  TO authenticated USING (true);

-- Atualizar product_categories com novas colunas
ALTER TABLE public.product_categories
  ADD COLUMN IF NOT EXISTS icon text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS product_type text DEFAULT 'produto',
  ADD COLUMN IF NOT EXISTS niche text,
  ADD COLUMN IF NOT EXISTS sku_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS track_inventory boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS allowed_variations text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS custom_fields jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS template_id text,
  ADD COLUMN IF NOT EXISTS cloned_from_id uuid,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Tabela category_import_logs
CREATE TABLE public.category_import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  file_name text,
  total_rows int DEFAULT 0,
  successful_imports int DEFAULT 0,
  failed_imports int DEFAULT 0,
  errors jsonb,
  status text DEFAULT 'completed',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.category_import_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.category_import_logs FOR ALL
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());
