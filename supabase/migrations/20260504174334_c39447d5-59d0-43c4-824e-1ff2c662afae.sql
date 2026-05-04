
CREATE TABLE public.axis_landing_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  empresa TEXT NOT NULL,
  cargo TEXT,
  tamanho_operacao TEXT NOT NULL,
  objetivo_principal TEXT NOT NULL,
  mensagem TEXT,
  consentimento_lgpd BOOLEAN NOT NULL DEFAULT false,
  origem TEXT DEFAULT 'landing-axis',
  user_agent TEXT,
  status TEXT DEFAULT 'novo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.axis_landing_leads ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_axis_landing_leads_created_at ON public.axis_landing_leads(created_at DESC);
