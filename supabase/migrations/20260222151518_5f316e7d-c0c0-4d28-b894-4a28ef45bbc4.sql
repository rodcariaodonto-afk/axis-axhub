
-- =============================================
-- WhatsApp Integration Tables
-- =============================================

-- 1. whatsapp_settings - Evolution API config per tenant
CREATE TABLE public.whatsapp_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  evolution_api_url text,
  evolution_api_key text,
  webhook_url text,
  auto_reply_enabled boolean NOT NULL DEFAULT false,
  auto_reply_message text,
  max_sessions integer NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage whatsapp settings"
  ON public.whatsapp_settings FOR ALL
  TO authenticated
  USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'))
  WITH CHECK (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can read whatsapp settings"
  ON public.whatsapp_settings FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant_id());

-- 2. whatsapp_sessions
CREATE TABLE public.whatsapp_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  session_name text NOT NULL,
  status text NOT NULL DEFAULT 'disconnected',
  qr_code text,
  evolution_instance_id text,
  phone_number text,
  last_connected_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation"
  ON public.whatsapp_sessions FOR ALL
  TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- 3. whatsapp_contacts
CREATE TABLE public.whatsapp_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.whatsapp_sessions(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  phone_number text NOT NULL,
  display_name text,
  profile_picture_url text,
  last_message_at timestamptz,
  unread_count integer NOT NULL DEFAULT 0,
  is_favorite boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation"
  ON public.whatsapp_contacts FOR ALL
  TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- 4. whatsapp_messages
CREATE TABLE public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.whatsapp_sessions(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.whatsapp_contacts(id) ON DELETE SET NULL,
  contact_phone text NOT NULL,
  message_type text NOT NULL DEFAULT 'text',
  content text,
  media_url text,
  media_type text,
  direction text NOT NULL DEFAULT 'outbound',
  status text NOT NULL DEFAULT 'sent',
  whatsapp_message_id text,
  sender_name text,
  sender_phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation"
  ON public.whatsapp_messages FOR ALL
  TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_sessions;

-- Indexes
CREATE INDEX idx_whatsapp_sessions_tenant ON public.whatsapp_sessions(tenant_id);
CREATE INDEX idx_whatsapp_contacts_session ON public.whatsapp_contacts(session_id);
CREATE INDEX idx_whatsapp_contacts_phone ON public.whatsapp_contacts(phone_number);
CREATE INDEX idx_whatsapp_messages_session ON public.whatsapp_messages(session_id);
CREATE INDEX idx_whatsapp_messages_contact ON public.whatsapp_messages(contact_id);
CREATE INDEX idx_whatsapp_messages_created ON public.whatsapp_messages(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_whatsapp_settings_updated_at BEFORE UPDATE ON public.whatsapp_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_whatsapp_sessions_updated_at BEFORE UPDATE ON public.whatsapp_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_whatsapp_contacts_updated_at BEFORE UPDATE ON public.whatsapp_contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
