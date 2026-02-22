
-- 1. Add type column to email_templates
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'geral';

-- 2. Create internal_conversations table
CREATE TABLE public.internal_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  type text NOT NULL DEFAULT 'direct', -- direct or group
  name text, -- only for groups
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.internal_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON public.internal_conversations
  FOR ALL USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- 3. Create internal_conversation_participants table
CREATE TABLE public.internal_conversation_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.internal_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  joined_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.internal_conversation_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON public.internal_conversation_participants
  FOR ALL USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- 4. Create internal_messages table
CREATE TABLE public.internal_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.internal_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  read_at timestamp with time zone
);

ALTER TABLE public.internal_messages ENABLE ROW LEVEL SECURITY;

-- Helper function to check conversation participation
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.internal_conversation_participants
    WHERE conversation_id = _conversation_id AND user_id = auth.uid()
  )
$$;

CREATE POLICY "Participants can manage messages" ON public.internal_messages
  FOR ALL USING (
    tenant_id = get_user_tenant_id() AND is_conversation_participant(conversation_id)
  )
  WITH CHECK (
    tenant_id = get_user_tenant_id() AND is_conversation_participant(conversation_id) AND sender_id = auth.uid()
  );

-- 5. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.internal_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.internal_conversations;

-- 6. Indexes
CREATE INDEX idx_internal_messages_conversation ON public.internal_messages(conversation_id, created_at);
CREATE INDEX idx_internal_participants_user ON public.internal_conversation_participants(user_id);
CREATE INDEX idx_internal_participants_conversation ON public.internal_conversation_participants(conversation_id);
CREATE INDEX idx_email_templates_type ON public.email_templates(type);

-- 7. Trigger for updated_at on conversations
CREATE TRIGGER update_internal_conversations_updated_at
  BEFORE UPDATE ON public.internal_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
