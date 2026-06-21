import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PJNotification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  related_id: string | null;
  related_type: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export function usePJNotifications(tenantId: string, pjId: string) {
  const queryClient = useQueryClient();
  const qKey = ["pj-notifications", tenantId, pjId];

  const query = useQuery({
    queryKey: qKey,
    enabled: !!tenantId && !!pjId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pj_notifications")
        .select("id, type, title, message, related_id, related_type, is_read, read_at, created_at")
        .eq("tenant_id", tenantId)
        .eq("pj_id", pjId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[usePJNotifications]", error);
        return [];
      }
      return (data ?? []) as PJNotification[];
    },
  });

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: qKey });
    queryClient.invalidateQueries({ queryKey: ["pj-unread-notifications", tenantId, pjId] });
    queryClient.invalidateQueries({ queryKey: ["pj-unread-notif-dashboard", tenantId, pjId] });
  }

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("pj_notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from("pj_notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("tenant_id", tenantId)
        .eq("pj_id", pjId)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  const unreadCount = (query.data ?? []).filter((n) => !n.is_read).length;

  return { ...query, markAsRead, markAllAsRead, unreadCount };
}
