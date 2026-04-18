-- WhatsApp Meta Cloud API — AXIS CRM
-- Tabela de conexões Meta

CREATE TABLE IF NOT EXISTS whatsapp_meta_connections (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL,
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                  VARCHAR(255) NOT NULL,
  phone_number_id       VARCHAR(100) NOT NULL,
  waba_id               VARCHAR(100) NOT NULL,
  access_token          TEXT NOT NULL,
  phone_number          VARCHAR(50),
  webhook_url           VARCHAR(500) NOT NULL,
  webhook_verify_token  VARCHAR(100) NOT NULL,
  is_active             BOOLEAN DEFAULT true,
  status                VARCHAR(20) DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected', 'error')),
  last_error            TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE whatsapp_meta_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meta_connections_tenant_isolation"
  ON whatsapp_meta_connections FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Tabela de mensagens Meta

CREATE TABLE IF NOT EXISTS whatsapp_meta_messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id    UUID NOT NULL REFERENCES whatsapp_meta_connections(id) ON DELETE CASCADE,
  tenant_id        UUID NOT NULL,
  message_id       VARCHAR(255) UNIQUE,
  phone_number     VARCHAR(50) NOT NULL,
  message_type     VARCHAR(30) NOT NULL DEFAULT 'text',
  message_content  TEXT,
  media_url        TEXT,
  direction        VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  status           VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','sent','delivered','read','failed')),
  error_message    TEXT,
  meta_timestamp   TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE whatsapp_meta_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meta_messages_tenant_isolation"
  ON whatsapp_meta_messages FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_meta_messages_connection ON whatsapp_meta_messages(connection_id);
CREATE INDEX IF NOT EXISTS idx_meta_messages_phone ON whatsapp_meta_messages(phone_number);
CREATE INDEX IF NOT EXISTS idx_meta_connections_tenant ON whatsapp_meta_connections(tenant_id);
