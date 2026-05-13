
-- 1. Expand tenants for cancellation/retention
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS retention_until timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS deletion_reason text;

-- 2. Expand audit_logs
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS event_type text,
  ADD COLUMN IF NOT EXISTS severity text DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON public.audit_logs(tenant_id, severity, created_at DESC);

-- 3. data_exports
CREATE TABLE IF NOT EXISTS public.data_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  requested_by uuid REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'pending',
  format text NOT NULL DEFAULT 'json',
  scope jsonb NOT NULL DEFAULT '[]'::jsonb,
  file_path text,
  file_url text,
  file_size_bytes bigint,
  expires_at timestamptz,
  completed_at timestamptz,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_data_exports_tenant ON public.data_exports(tenant_id, created_at DESC);
ALTER TABLE public.data_exports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_admins_select_exports" ON public.data_exports FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'));
CREATE POLICY "tenant_admins_insert_exports" ON public.data_exports FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'));
CREATE POLICY "tenant_admins_update_exports" ON public.data_exports FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'));

-- 4. data_deletion_requests
CREATE TABLE IF NOT EXISTS public.data_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  requested_by uuid REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'pending',
  reason text,
  scheduled_for timestamptz,
  confirmation_token text,
  confirmed_at timestamptz,
  executed_at timestamptz,
  audit_snapshot jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_data_deletion_tenant ON public.data_deletion_requests(tenant_id, status);
ALTER TABLE public.data_deletion_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_admins_all_deletion" ON public.data_deletion_requests FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'))
  WITH CHECK (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_data_deletion_updated BEFORE UPDATE ON public.data_deletion_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. data_subject_requests
CREATE TABLE IF NOT EXISTS public.data_subject_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  requester_name text NOT NULL,
  requester_email text NOT NULL,
  request_type text NOT NULL,
  related_entity_type text,
  related_entity_id uuid,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'medium',
  description text,
  assigned_to uuid REFERENCES auth.users(id),
  due_at timestamptz,
  resolved_at timestamptz,
  resolution_notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dsr_tenant_status ON public.data_subject_requests(tenant_id, status, due_at);
ALTER TABLE public.data_subject_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_admins_all_dsr" ON public.data_subject_requests FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'))
  WITH CHECK (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_dsr_updated BEFORE UPDATE ON public.data_subject_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. data_governance_policies (1 per tenant)
CREATE TABLE IF NOT EXISTS public.data_governance_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  retention_days integer NOT NULL DEFAULT 30,
  export_expiration_hours integer NOT NULL DEFAULT 72,
  allow_export_roles text[] DEFAULT ARRAY['admin'],
  allow_deletion_roles text[] DEFAULT ARRAY['admin'],
  data_classification jsonb DEFAULT '{}'::jsonb,
  communication_rules jsonb DEFAULT '{}'::jsonb,
  dsr_sla_days integer DEFAULT 15,
  anonymization_policy jsonb DEFAULT '{}'::jsonb,
  log_restricted_access boolean DEFAULT true,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.data_governance_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_admins_all_policies" ON public.data_governance_policies FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'))
  WITH CHECK (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_policies_updated BEFORE UPDATE ON public.data_governance_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. data_consents
CREATE TABLE IF NOT EXISTS public.data_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subject_type text NOT NULL,
  subject_id uuid,
  subject_label text,
  channel text NOT NULL,
  consent_status text NOT NULL DEFAULT 'pending',
  consent_source text,
  legal_basis text,
  data_origin text,
  given_at timestamptz,
  revoked_at timestamptz,
  privacy_notes text,
  communication_opt_in boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_consents_tenant_subject ON public.data_consents(tenant_id, subject_type, subject_id);
ALTER TABLE public.data_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select_consents" ON public.data_consents FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id());
CREATE POLICY "tenant_admins_write_consents" ON public.data_consents FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'));
CREATE POLICY "tenant_admins_update_consents" ON public.data_consents FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'));
CREATE POLICY "tenant_admins_delete_consents" ON public.data_consents FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'));

-- 8. Storage bucket (private) for exports
INSERT INTO storage.buckets (id, name, public)
VALUES ('data-exports', 'data-exports', false)
ON CONFLICT (id) DO NOTHING;

-- Tenant isolation by path prefix (first folder = tenant_id)
CREATE POLICY "tenant_admins_read_export_files" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'data-exports'
    AND has_role(auth.uid(), 'admin')
    AND (storage.foldername(name))[1] = get_user_tenant_id()::text
  );
