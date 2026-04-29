-- ============================================================
-- MIGRATION: Integração Fiscal Focus NFe
-- Tenant-aware, RLS habilitado, sem armazenar senha em banco
-- ============================================================

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================
-- 1. TABELA: fiscal_settings (1 por tenant)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.fiscal_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  company_name TEXT NOT NULL,
  cnpj TEXT NOT NULL,
  ie TEXT,
  im TEXT,
  regime_tributario INTEGER NOT NULL CHECK (regime_tributario IN (1,2,3)),

  endereco_logradouro TEXT,
  endereco_numero TEXT,
  endereco_complemento TEXT,
  endereco_bairro TEXT,
  endereco_municipio TEXT,
  endereco_uf TEXT CHECK (endereco_uf IS NULL OR char_length(endereco_uf) = 2),
  endereco_cep TEXT,
  codigo_municipio_ibge TEXT,

  focus_token_homologacao TEXT,
  focus_token_producao TEXT,
  focus_environment TEXT NOT NULL DEFAULT 'homologacao'
    CHECK (focus_environment IN ('homologacao','producao')),
  focus_empresa_id_homologacao TEXT,
  focus_empresa_id_producao TEXT,

  certificate_path TEXT,
  certificate_uploaded_at TIMESTAMPTZ,
  certificate_registered_on_focus BOOLEAN NOT NULL DEFAULT false,

  habilita_nfe BOOLEAN NOT NULL DEFAULT false,
  habilita_nfse BOOLEAN NOT NULL DEFAULT false,
  habilita_nfce BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fiscal_settings_tenant_unique UNIQUE (tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_fiscal_settings_tenant
  ON public.fiscal_settings(tenant_id);

-- ============================================================
-- 2. TABELA: fiscal_invoices
-- ============================================================
CREATE TABLE IF NOT EXISTS public.fiscal_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,

  type TEXT NOT NULL CHECK (type IN ('nfe','nfse','nfce')),
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente','processando','autorizada','cancelada','erro','rejeitada')),

  focus_ref TEXT NOT NULL UNIQUE,
  focus_environment TEXT NOT NULL CHECK (focus_environment IN ('homologacao','producao')),

  chave_nfe TEXT,
  numero TEXT,
  serie TEXT,
  protocolo TEXT,
  caminho_xml TEXT,
  caminho_danfe TEXT,
  status_sefaz TEXT,
  mensagem_sefaz TEXT,

  payload_enviado JSONB,
  resposta_focus JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fiscal_invoices_no_duplicate_processing
    EXCLUDE USING gist (order_id WITH =, type WITH =)
    WHERE (status IN ('pendente','processando','autorizada'))
);

CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_tenant ON public.fiscal_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_order ON public.fiscal_invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_status ON public.fiscal_invoices(status);
CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_focus_ref ON public.fiscal_invoices(focus_ref);

-- ============================================================
-- 3. CAMPOS FISCAIS NA TABELA products
-- ============================================================
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS ncm TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cfop TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cst TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unidade_fiscal TEXT DEFAULT 'UN';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS origem_icms INTEGER DEFAULT 0;

-- ============================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.fiscal_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_fiscal_settings"
  ON public.fiscal_settings FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "tenant_isolation_insert_fiscal_settings"
  ON public.fiscal_settings FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "tenant_isolation_update_fiscal_settings"
  ON public.fiscal_settings FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id())
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "tenant_isolation_delete_fiscal_settings"
  ON public.fiscal_settings FOR DELETE
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "tenant_isolation_select_fiscal_invoices"
  ON public.fiscal_invoices FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "tenant_isolation_insert_fiscal_invoices"
  ON public.fiscal_invoices FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "tenant_isolation_update_fiscal_invoices"
  ON public.fiscal_invoices FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id())
  WITH CHECK (tenant_id = public.get_user_tenant_id());

-- ============================================================
-- 5. TRIGGER updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_fiscal_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fiscal_settings_updated_at ON public.fiscal_settings;
CREATE TRIGGER trg_fiscal_settings_updated_at
  BEFORE UPDATE ON public.fiscal_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_fiscal_updated_at();

DROP TRIGGER IF EXISTS trg_fiscal_invoices_updated_at ON public.fiscal_invoices;
CREATE TRIGGER trg_fiscal_invoices_updated_at
  BEFORE UPDATE ON public.fiscal_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_fiscal_updated_at();

-- ============================================================
-- 6. STORAGE BUCKET privado para certificados .pfx
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'fiscal-certificates',
  'fiscal-certificates',
  false,
  5242880,
  ARRAY['application/x-pkcs12','application/octet-stream']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "tenant_upload_own_certificate"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'fiscal-certificates'
    AND (storage.foldername(name))[1] = public.get_user_tenant_id()::text
  );

CREATE POLICY "tenant_read_own_certificate"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'fiscal-certificates'
    AND (storage.foldername(name))[1] = public.get_user_tenant_id()::text
  );

CREATE POLICY "tenant_update_own_certificate"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'fiscal-certificates'
    AND (storage.foldername(name))[1] = public.get_user_tenant_id()::text
  );

CREATE POLICY "tenant_delete_own_certificate"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'fiscal-certificates'
    AND (storage.foldername(name))[1] = public.get_user_tenant_id()::text
  );