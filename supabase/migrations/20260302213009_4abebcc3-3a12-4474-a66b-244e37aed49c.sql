
-- Table to persist paused workflow executions waiting for WhatsApp replies
CREATE TABLE public.workflow_waiting_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  execution_id UUID NOT NULL REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  session_id UUID REFERENCES public.whatsapp_sessions(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  remaining_nodes JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'waiting'
);

-- Index for fast lookup by phone + status (used by webhook)
CREATE INDEX idx_workflow_waiting_phone_status ON public.workflow_waiting_states (phone, status) WHERE status = 'waiting';

-- Index for cleanup of expired states
CREATE INDEX idx_workflow_waiting_expires ON public.workflow_waiting_states (expires_at) WHERE status = 'waiting' AND expires_at IS NOT NULL;

-- RLS: only service_role access (edge functions only)
ALTER TABLE public.workflow_waiting_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_waiting_states FORCE ROW LEVEL SECURITY;

-- Add 'waiting' to workflow_executions status vocabulary (no enum, just text column - already supports it)
