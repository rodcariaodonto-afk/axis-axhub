
-- 1. product_variations
CREATE TABLE public.product_variations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  variation_name TEXT NOT NULL,
  variation_values JSONB NOT NULL DEFAULT '{}',
  price NUMERIC NOT NULL DEFAULT 0,
  cost NUMERIC DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.product_variations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.product_variations AS RESTRICTIVE FOR ALL USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());
CREATE INDEX idx_product_variations_product ON public.product_variations(product_id);

-- 2. product_channels
CREATE TABLE public.product_channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  channel_name TEXT NOT NULL,
  channel_sku TEXT,
  channel_url TEXT,
  sync_enabled BOOLEAN NOT NULL DEFAULT true,
  last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.product_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.product_channels AS RESTRICTIVE FOR ALL USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());
CREATE INDEX idx_product_channels_product ON public.product_channels(product_id);

-- 3. notification_logs
CREATE TABLE public.notification_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'in_app',
  status TEXT NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  error_message TEXT
);
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant read logs" ON public.notification_logs AS RESTRICTIVE FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Tenant insert logs" ON public.notification_logs AS RESTRICTIVE FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());

-- 4. documentation_videos
CREATE TABLE public.documentation_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  niche TEXT NOT NULL DEFAULT 'geral',
  category TEXT NOT NULL DEFAULT 'tutorial',
  order_index INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.documentation_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage videos" ON public.documentation_videos AS RESTRICTIVE FOR ALL USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin')) WITH CHECK (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can read published videos" ON public.documentation_videos AS RESTRICTIVE FOR SELECT USING (tenant_id = get_user_tenant_id() AND is_published = true);

-- 5. documentation_faqs
CREATE TABLE public.documentation_faqs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  niche TEXT NOT NULL DEFAULT 'geral',
  category TEXT NOT NULL DEFAULT 'geral',
  order_index INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.documentation_faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage faqs" ON public.documentation_faqs AS RESTRICTIVE FOR ALL USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin')) WITH CHECK (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can read published faqs" ON public.documentation_faqs AS RESTRICTIVE FOR SELECT USING (tenant_id = get_user_tenant_id() AND is_published = true);
