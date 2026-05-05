-- ============================================================================
-- Migration: WhatsApp Meta Workflow Trigger - Slice 1 (DB Setup)
-- Adiciona suporte a provider Meta na tabela de waiting states + índices de performance
-- Data: 2026-05-05
-- Reversível: DROP COLUMN provider; DROP INDEX dos 2 índices criados
-- ============================================================================

BEGIN;

-- ── 1. Coluna provider em workflow_waiting_states ──
-- Permite distinguir entre waiting de Evolution e Meta para resume correto
ALTER TABLE public.workflow_waiting_states
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'evolution';

-- ── 2. Índice em whatsapp_meta_messages ──
-- Acelera consulta "primeira mensagem em N dias" da nova condition
CREATE INDEX IF NOT EXISTS idx_whatsapp_meta_messages_tenant_phone_inbound
  ON public.whatsapp_meta_messages (tenant_id, phone_number, direction, created_at DESC);

-- ── 3. Índice em workflow_waiting_states ──
-- Acelera lookup do webhook por phone + provider para resume
CREATE INDEX IF NOT EXISTS idx_workflow_waiting_states_phone_provider
  ON public.workflow_waiting_states (phone, provider, status);

COMMIT;

-- ============================================================================
-- Validação pós-migration (rodar separadamente após COMMIT):
--
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'workflow_waiting_states' AND column_name = 'provider';
-- 
-- Esperado: 1 row (provider | text | 'evolution'::text)
--
-- SELECT indexname FROM pg_indexes
-- WHERE indexname IN (
--   'idx_whatsapp_meta_messages_tenant_phone_inbound',
--   'idx_workflow_waiting_states_phone_provider'
-- );
--
-- Esperado: 2 rows
-- ============================================================================
