
-- Tabela de filas de atendimento
CREATE TABLE public.whatsapp_queues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_queues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for whatsapp_queues"
  ON public.whatsapp_queues
  FOR ALL
  TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- Membros das filas
CREATE TABLE public.whatsapp_queue_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id uuid NOT NULL REFERENCES public.whatsapp_queues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(queue_id, user_id)
);

ALTER TABLE public.whatsapp_queue_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for whatsapp_queue_members"
  ON public.whatsapp_queue_members
  FOR ALL
  TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- Log de transferências
CREATE TABLE public.whatsapp_transfer_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL,
  from_user_id uuid REFERENCES auth.users(id),
  to_user_id uuid REFERENCES auth.users(id),
  to_queue_id uuid REFERENCES public.whatsapp_queues(id),
  reason text,
  transferred_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_transfer_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for whatsapp_transfer_logs"
  ON public.whatsapp_transfer_logs
  FOR ALL
  TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());
