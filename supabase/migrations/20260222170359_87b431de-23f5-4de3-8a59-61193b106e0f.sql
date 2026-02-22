
-- Add new columns to deals
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS descricao text;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS observacoes text;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS probabilidade_percentual integer DEFAULT 50;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS prioridade text DEFAULT 'normal';
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS posicao_na_coluna integer DEFAULT 0;

-- Add color to pipeline_stages
ALTER TABLE public.pipeline_stages ADD COLUMN IF NOT EXISTS cor_hex varchar(7) DEFAULT '#3B82F6';

-- Create deal_history table
CREATE TABLE public.deal_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  tipo_acao text NOT NULL,
  coluna_origem_id uuid REFERENCES public.pipeline_stages(id),
  coluna_destino_id uuid REFERENCES public.pipeline_stages(id),
  campo_alterado text,
  valor_anterior text,
  valor_novo text,
  usuario_id uuid,
  comentario text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.deal_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON public.deal_history
  AS RESTRICTIVE FOR ALL
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE INDEX idx_deal_history_deal_id ON public.deal_history(deal_id);
CREATE INDEX idx_deal_history_tenant_id ON public.deal_history(tenant_id);
