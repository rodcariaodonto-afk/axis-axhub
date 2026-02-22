
-- Campanhas
CREATE TABLE public.campanhas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  nome text NOT NULL,
  descricao text,
  status text NOT NULL DEFAULT 'rascunho',
  mensagem_template text NOT NULL DEFAULT '',
  session_id uuid REFERENCES public.whatsapp_sessions(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.campanhas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.campanhas AS RESTRICTIVE FOR ALL
  USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());

-- Configurações de campanha
CREATE TABLE public.campanhas_configuracoes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  campanha_id uuid NOT NULL REFERENCES public.campanhas(id) ON DELETE CASCADE,
  delay_minimo_segundos integer NOT NULL DEFAULT 2,
  delay_maximo_segundos integer NOT NULL DEFAULT 5,
  usar_sequencia_aleatoria boolean NOT NULL DEFAULT true,
  nao_disparar_sabados boolean NOT NULL DEFAULT false,
  nao_disparar_domingos boolean NOT NULL DEFAULT false,
  nao_disparar_feriados boolean NOT NULL DEFAULT true,
  hora_inicio_disparo time NOT NULL DEFAULT '08:00',
  hora_fim_disparo time NOT NULL DEFAULT '20:00'
);
ALTER TABLE public.campanhas_configuracoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.campanhas_configuracoes AS RESTRICTIVE FOR ALL
  USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());

-- Contatos da campanha
CREATE TABLE public.campanhas_contatos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  campanha_id uuid NOT NULL REFERENCES public.campanhas(id) ON DELETE CASCADE,
  telefone text NOT NULL,
  nome text,
  status text NOT NULL DEFAULT 'pendente',
  enviado_em timestamptz,
  erro_mensagem text,
  tempo_espera_segundos integer
);
ALTER TABLE public.campanhas_contatos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.campanhas_contatos AS RESTRICTIVE FOR ALL
  USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());

-- Histórico de envios
CREATE TABLE public.campanhas_historico_envios (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  campanha_id uuid NOT NULL REFERENCES public.campanhas(id) ON DELETE CASCADE,
  contato_telefone text NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  mensagem_texto text NOT NULL DEFAULT '',
  erro_mensagem text,
  tempo_espera_segundos integer NOT NULL DEFAULT 0,
  enviado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.campanhas_historico_envios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.campanhas_historico_envios AS RESTRICTIVE FOR ALL
  USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());

-- Fluxo recebimento logs
CREATE TABLE public.fluxo_recebimento_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  campanha_id uuid NOT NULL REFERENCES public.campanhas(id) ON DELETE CASCADE,
  telefone text NOT NULL,
  mensagem_recebida text,
  status_fluxo text NOT NULL DEFAULT 'recebido',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fluxo_recebimento_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.fluxo_recebimento_logs AS RESTRICTIVE FOR ALL
  USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());

-- Indexes
CREATE INDEX idx_campanhas_tenant ON public.campanhas(tenant_id);
CREATE INDEX idx_campanhas_contatos_campanha ON public.campanhas_contatos(campanha_id);
CREATE INDEX idx_campanhas_contatos_telefone ON public.campanhas_contatos(telefone);
CREATE INDEX idx_campanhas_historico_campanha ON public.campanhas_historico_envios(campanha_id);
CREATE INDEX idx_fluxo_recebimento_campanha ON public.fluxo_recebimento_logs(campanha_id);
CREATE INDEX idx_fluxo_recebimento_telefone ON public.fluxo_recebimento_logs(telefone);
