import { supabase } from "@/integrations/supabase/client";
import { getUserProfile } from "@/lib/getUserTenantId";

export async function emitEvent(eventName: string, payload: Record<string, any>) {
  try {
    const profile = await getUserProfile();
    if (!profile) return;
    await supabase.from("event_outbox").insert({
      tenant_id: profile.tenant_id,
      event_name: eventName,
      payload,
      actor_user_id: profile.id,
    });
  } catch (err) {
    console.error("[emitEvent] Failed to emit", eventName, err);
  }
}
