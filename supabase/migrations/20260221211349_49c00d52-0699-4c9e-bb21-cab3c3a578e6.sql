
-- ========================================
-- 1. DOCUMENTATION TABLE
-- ========================================
CREATE TABLE public.documentation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  niche VARCHAR(50) NOT NULL,
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100),
  content TEXT NOT NULL,
  content_html TEXT,
  version INT DEFAULT 1,
  previous_version_id UUID REFERENCES public.documentation(id),
  meta_title VARCHAR(255),
  meta_description VARCHAR(255),
  keywords TEXT[] DEFAULT '{}',
  is_published BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  order_index INT DEFAULT 0,
  created_by UUID NOT NULL,
  updated_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('portuguese', coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(content,''))
  ) STORED,
  UNIQUE(tenant_id, slug)
);

-- ========================================
-- 2. DOCUMENTATION_VIEWS TABLE
-- ========================================
CREATE TABLE public.documentation_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documentation_id UUID NOT NULL REFERENCES public.documentation(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  view_count INT DEFAULT 1,
  time_spent_seconds INT DEFAULT 0,
  helpful_yes INT DEFAULT 0,
  helpful_no INT DEFAULT 0,
  last_viewed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(documentation_id, user_id)
);

-- ========================================
-- 3. DOCUMENTATION_FEEDBACK TABLE
-- ========================================
CREATE TABLE public.documentation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documentation_id UUID NOT NULL REFERENCES public.documentation(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_helpful BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(documentation_id, user_id)
);

-- ========================================
-- 4. DOCUMENTATION_TRANSLATIONS TABLE
-- ========================================
CREATE TABLE public.documentation_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documentation_id UUID NOT NULL REFERENCES public.documentation(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  language VARCHAR(10) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  content_html TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(documentation_id, language)
);

-- ========================================
-- INDEXES
-- ========================================
CREATE INDEX idx_documentation_search_vector ON public.documentation USING GIN (search_vector);
CREATE INDEX idx_documentation_tenant_niche ON public.documentation (tenant_id, niche);
CREATE INDEX idx_documentation_slug ON public.documentation (slug);
CREATE INDEX idx_documentation_category ON public.documentation (tenant_id, category);
CREATE INDEX idx_documentation_published ON public.documentation (tenant_id, is_published);
CREATE INDEX idx_documentation_views_doc ON public.documentation_views (documentation_id);
CREATE INDEX idx_documentation_feedback_doc ON public.documentation_feedback (documentation_id);

-- ========================================
-- RLS: DOCUMENTATION
-- ========================================
ALTER TABLE public.documentation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read published docs"
ON public.documentation FOR SELECT TO authenticated
USING (tenant_id = get_user_tenant_id() AND is_published = true);

CREATE POLICY "Admins can read all docs"
ON public.documentation FOR SELECT TO authenticated
USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert docs"
ON public.documentation FOR INSERT TO authenticated
WITH CHECK (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update docs"
ON public.documentation FOR UPDATE TO authenticated
USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete docs"
ON public.documentation FOR DELETE TO authenticated
USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'));

-- ========================================
-- RLS: DOCUMENTATION_VIEWS
-- ========================================
ALTER TABLE public.documentation_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own views"
ON public.documentation_views FOR SELECT TO authenticated
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can insert own views"
ON public.documentation_views FOR INSERT TO authenticated
WITH CHECK (tenant_id = get_user_tenant_id() AND user_id = auth.uid());

CREATE POLICY "Users can update own views"
ON public.documentation_views FOR UPDATE TO authenticated
USING (tenant_id = get_user_tenant_id() AND user_id = auth.uid());

-- ========================================
-- RLS: DOCUMENTATION_FEEDBACK
-- ========================================
ALTER TABLE public.documentation_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view feedback in tenant"
ON public.documentation_feedback FOR SELECT TO authenticated
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can insert own feedback"
ON public.documentation_feedback FOR INSERT TO authenticated
WITH CHECK (tenant_id = get_user_tenant_id() AND user_id = auth.uid());

CREATE POLICY "Users can update own feedback"
ON public.documentation_feedback FOR UPDATE TO authenticated
USING (tenant_id = get_user_tenant_id() AND user_id = auth.uid());

-- ========================================
-- RLS: DOCUMENTATION_TRANSLATIONS
-- ========================================
ALTER TABLE public.documentation_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read translations in tenant"
ON public.documentation_translations FOR SELECT TO authenticated
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can insert translations"
ON public.documentation_translations FOR INSERT TO authenticated
WITH CHECK (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update translations"
ON public.documentation_translations FOR UPDATE TO authenticated
USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete translations"
ON public.documentation_translations FOR DELETE TO authenticated
USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'));

-- ========================================
-- TRIGGER: updated_at
-- ========================================
CREATE TRIGGER update_documentation_updated_at
BEFORE UPDATE ON public.documentation
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documentation_feedback_updated_at
BEFORE UPDATE ON public.documentation_feedback
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documentation_translations_updated_at
BEFORE UPDATE ON public.documentation_translations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
