
-- Add whatsapp_jid to contacts
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS whatsapp_jid VARCHAR;

-- Create mensagens_historico table
CREATE TABLE public.mensagens_historico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  contato_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  remetente TEXT NOT NULL,
  destinatario TEXT NOT NULL,
  mensagem TEXT,
  message_type TEXT NOT NULL DEFAULT 'text',
  whatsapp_message_id TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mensagens_historico ENABLE ROW LEVEL SECURITY;

-- RLS policy for tenant isolation
CREATE POLICY "Tenant isolation" ON public.mensagens_historico
  AS RESTRICTIVE FOR ALL
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- Indexes
CREATE INDEX idx_mensagens_historico_contato ON public.mensagens_historico(contato_id);
CREATE INDEX idx_mensagens_historico_deal ON public.mensagens_historico(deal_id);
CREATE INDEX idx_mensagens_historico_tenant ON public.mensagens_historico(tenant_id);
CREATE INDEX idx_mensagens_historico_whatsapp_msg ON public.mensagens_historico(whatsapp_message_id);
