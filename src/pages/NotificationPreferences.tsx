import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_CATEGORY_LABELS,
  type NotificationType,
} from "@/components/notifications/notificationTypes";

interface Preference {
  notification_type_id: string;
  is_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

export default function NotificationPreferencesPage() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<Map<string, Preference>>(new Map());
  const [loading, setLoading] = useState(true);

  const fetchPreferences = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notification_preferences")
      .select("*");
    const map = new Map<string, Preference>();
    (data || []).forEach((p: any) => map.set(p.notification_type_id, p));
    setPreferences(map);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchPreferences(); }, [fetchPreferences]);

  const toggleEnabled = async (typeId: string, enabled: boolean) => {
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
    if (!profile) return;

    const existing = preferences.get(typeId);
    if (existing) {
      await supabase.from("notification_preferences").update({ is_enabled: enabled }).eq("user_id", user.id).eq("notification_type_id", typeId);
    } else {
      await supabase.from("notification_preferences").insert({
        tenant_id: profile.tenant_id,
        user_id: user.id,
        notification_type_id: typeId,
        is_enabled: enabled,
      });
    }
    setPreferences((prev) => {
      const next = new Map(prev);
      next.set(typeId, { ...prev.get(typeId) || { notification_type_id: typeId, quiet_hours_enabled: false, quiet_hours_start: null, quiet_hours_end: null }, is_enabled: enabled });
      return next;
    });
    toast.success(enabled ? "Notificação ativada" : "Notificação desativada");
  };

  const toggleQuietHours = async (typeId: string, enabled: boolean) => {
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
    if (!profile) return;

    const existing = preferences.get(typeId);
    if (existing) {
      await supabase.from("notification_preferences").update({
        quiet_hours_enabled: enabled,
        quiet_hours_start: enabled ? "22:00" : null,
        quiet_hours_end: enabled ? "08:00" : null,
      }).eq("user_id", user.id).eq("notification_type_id", typeId);
    } else {
      await supabase.from("notification_preferences").insert({
        tenant_id: profile.tenant_id,
        user_id: user.id,
        notification_type_id: typeId,
        is_enabled: true,
        quiet_hours_enabled: enabled,
        quiet_hours_start: enabled ? "22:00" : null,
        quiet_hours_end: enabled ? "08:00" : null,
      });
    }
    setPreferences((prev) => {
      const next = new Map(prev);
      next.set(typeId, {
        ...prev.get(typeId) || { notification_type_id: typeId, is_enabled: true, quiet_hours_start: null, quiet_hours_end: null },
        quiet_hours_enabled: enabled,
        quiet_hours_start: enabled ? "22:00" : prev.get(typeId)?.quiet_hours_start || null,
        quiet_hours_end: enabled ? "08:00" : prev.get(typeId)?.quiet_hours_end || null,
      });
      return next;
    });
  };

  const categories = [...new Set(NOTIFICATION_TYPES.map((t) => t.category))];

  if (loading) {
    return <div className="flex items-center justify-center h-32"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Preferências de Notificações</h2>
        <p className="text-sm text-muted-foreground">Configure quais notificações você deseja receber</p>
      </div>

      {categories.map((cat) => (
        <Card key={cat} className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{NOTIFICATION_CATEGORY_LABELS[cat] || cat}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {NOTIFICATION_TYPES.filter((t) => t.category === cat).map((type, i, arr) => {
              const pref = preferences.get(type.id);
              const isEnabled = pref?.is_enabled !== false; // default true
              const quietEnabled = pref?.quiet_hours_enabled || false;

              return (
                <div key={type.id}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{type.name}</p>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    </div>
                    <Switch checked={isEnabled} onCheckedChange={(v) => toggleEnabled(type.id, v)} />
                  </div>
                  {isEnabled && (
                    <div className="mt-2 ml-4 flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Switch checked={quietEnabled} onCheckedChange={(v) => toggleQuietHours(type.id, v)} className="scale-75" />
                        <span className="text-xs text-muted-foreground">Horário silencioso</span>
                      </div>
                      {quietEnabled && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span>{pref?.quiet_hours_start || "22:00"}</span>
                          <span>até</span>
                          <span>{pref?.quiet_hours_end || "08:00"}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {i < arr.length - 1 && <Separator className="mt-4" />}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
