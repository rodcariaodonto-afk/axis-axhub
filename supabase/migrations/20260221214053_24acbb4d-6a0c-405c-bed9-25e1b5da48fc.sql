
-- Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  notification_type_id VARCHAR(100) NOT NULL,
  recipient_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  action_url VARCHAR(500),
  related_entity_type VARCHAR(50),
  related_entity_id UUID,
  priority VARCHAR(20) NOT NULL DEFAULT 'normal',
  is_read BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  read_at TIMESTAMPTZ
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only read their own notifications
CREATE POLICY "Users read own notifications"
ON public.notifications FOR SELECT
USING (tenant_id = get_user_tenant_id() AND recipient_id = auth.uid());

-- System/any authenticated user in tenant can insert (for triggering notifications)
CREATE POLICY "Tenant can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id());

-- Users can update (mark read/archive) their own notifications
CREATE POLICY "Users update own notifications"
ON public.notifications FOR UPDATE
USING (tenant_id = get_user_tenant_id() AND recipient_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "Users delete own notifications"
ON public.notifications FOR DELETE
USING (tenant_id = get_user_tenant_id() AND recipient_id = auth.uid());

CREATE INDEX idx_notifications_recipient ON public.notifications(recipient_id, is_read);
CREATE INDEX idx_notifications_tenant ON public.notifications(tenant_id);
CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Notification preferences table
CREATE TABLE public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  user_id UUID NOT NULL,
  notification_type_id VARCHAR(100) NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, user_id, notification_type_id)
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own preferences"
ON public.notification_preferences FOR SELECT
USING (tenant_id = get_user_tenant_id() AND user_id = auth.uid());

CREATE POLICY "Users insert own preferences"
ON public.notification_preferences FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id() AND user_id = auth.uid());

CREATE POLICY "Users update own preferences"
ON public.notification_preferences FOR UPDATE
USING (tenant_id = get_user_tenant_id() AND user_id = auth.uid());

CREATE INDEX idx_notification_prefs_user ON public.notification_preferences(user_id);

CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
