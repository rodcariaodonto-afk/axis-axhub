
-- =============================================
-- FUNIS DE VENDA - 6 tabelas
-- =============================================

-- 1. Tabela principal de funis
CREATE TABLE public.funis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  nome TEXT NOT NULL,
  descricao TEXT,
  status TEXT NOT NULL DEFAULT 'rascunho',
  gatilho_tipo TEXT,
  gatilho_config JSONB DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.funis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.funis FOR ALL USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());
CREATE TRIGGER update_funis_updated_at BEFORE UPDATE ON public.funis FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX idx_funis_tenant ON public.funis(tenant_id);

-- 2. Blocos do canvas
CREATE TABLE public.funis_blocos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funil_id UUID NOT NULL REFERENCES public.funis(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  tipo TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  posicao_x DOUBLE PRECISION NOT NULL DEFAULT 0,
  posicao_y DOUBLE PRECISION NOT NULL DEFAULT 0,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.funis_blocos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.funis_blocos FOR ALL USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());
CREATE INDEX idx_funis_blocos_funil ON public.funis_blocos(funil_id);

-- 3. Conexões entre blocos (edges)
CREATE TABLE public.funis_conexoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funil_id UUID NOT NULL REFERENCES public.funis(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  source_bloco_id UUID NOT NULL REFERENCES public.funis_blocos(id) ON DELETE CASCADE,
  target_bloco_id UUID NOT NULL REFERENCES public.funis_blocos(id) ON DELETE CASCADE,
  source_handle TEXT,
  target_handle TEXT,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.funis_conexoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.funis_conexoes FOR ALL USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());
CREATE INDEX idx_funis_conexoes_funil ON public.funis_conexoes(funil_id);

-- 4. Execuções de funil por contato
CREATE TABLE public.funis_execucoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funil_id UUID NOT NULL REFERENCES public.funis(id),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  contato_telefone TEXT NOT NULL,
  contato_nome TEXT,
  status TEXT NOT NULL DEFAULT 'em_andamento',
  bloco_atual_id UUID REFERENCES public.funis_blocos(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.funis_execucoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.funis_execucoes FOR ALL USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());
CREATE INDEX idx_funis_execucoes_funil ON public.funis_execucoes(funil_id);
CREATE INDEX idx_funis_execucoes_status ON public.funis_execucoes(status);

-- 5. Logs detalhados de cada passo
CREATE TABLE public.funis_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  execucao_id UUID NOT NULL REFERENCES public.funis_execucoes(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  bloco_id UUID REFERENCES public.funis_blocos(id),
  bloco_tipo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'executado',
  detalhes JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.funis_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.funis_logs FOR ALL USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());
CREATE INDEX idx_funis_logs_execucao ON public.funis_logs(execucao_id);

-- 6. Variáveis dinâmicas por execução
CREATE TABLE public.funis_variaveis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  execucao_id UUID NOT NULL REFERENCES public.funis_execucoes(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  chave TEXT NOT NULL,
  valor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.funis_variaveis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.funis_variaveis FOR ALL USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());
CREATE INDEX idx_funis_variaveis_execucao ON public.funis_variaveis(execucao_id);
CREATE UNIQUE INDEX idx_funis_variaveis_unique ON public.funis_variaveis(execucao_id, chave);
CREATE TRIGGER update_funis_variaveis_updated_at BEFORE UPDATE ON public.funis_variaveis FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
