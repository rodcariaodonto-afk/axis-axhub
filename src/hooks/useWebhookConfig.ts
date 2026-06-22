import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getUserTenantId } from "@/lib/getUserTenantId";
import { toast } from "@/hooks/use-toast";

export const PJ_EVENTS = [
  { value: "nf.approved",        label: "NF Aprovada",             description: "Nota fiscal aprovada no workflow" },
  { value: "nf.rejected",        label: "NF Rejeitada",            description: "Nota fiscal rejeitada no workflow" },
  { value: "repasse.created",    label: "Repasse Criado",          description: "Repasse programado processado" },
  { value: "document.expiring",  label: "Documento Vencendo",      description: "Documento próximo do vencimento" },
  { value: "contract.expiring",  label: "Contrato Vencendo",       description: "Contrato próximo do vencimento" },
] as const;

export type PJEvent = (typeof PJ_EVENTS)[number]["value"];

export interface WebhookRow {
  id: string;
  integration_id: string;
  tenant_id: string;
  webhook_url: string;
  webhook_secret: string;
  events: PJEvent[];
  is_active: boolean;
  last_triggered_at: string | null;
  failed_attempts: number;
  created_at: string;
}

async function getPJIntegrationId(tenantId: string): Promise<string> {
  const { data: existing } = await (supabase as any)
    .from("integrations")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("platform", "pj_management")
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data: created, error } = await (supabase as any)
    .from("integrations")
    .insert({ tenant_id: tenantId, platform: "pj_management", is_active: true })
    .select("id")
    .single();

  if (error) throw error;
  return created.id;
}

export function useWebhooks() {
  return useQuery({
    queryKey: ["webhooks-pj"],
    staleTime: 30_000,
    queryFn: async () => {
      const tenantId = await getUserTenantId();
      if (!tenantId) return [];

      const integrationId = await getPJIntegrationId(tenantId);

      const { data, error } = await (supabase as any)
        .from("integration_webhooks")
        .select("id,integration_id,tenant_id,webhook_url,webhook_secret,events,is_active,last_triggered_at,failed_attempts,created_at")
        .eq("integration_id", integrationId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as WebhookRow[];
    },
  });
}

export interface CreateWebhookInput {
  webhook_url: string;
  events: PJEvent[];
}

export function useCreateWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateWebhookInput): Promise<WebhookRow> => {
      const tenantId = await getUserTenantId();
      if (!tenantId) throw new Error("Tenant não encontrado");

      const integrationId = await getPJIntegrationId(tenantId);

      const { data, error } = await (supabase as any)
        .from("integration_webhooks")
        .insert({
          integration_id: integrationId,
          tenant_id: tenantId,
          webhook_url: input.webhook_url,
          events: input.events,
          is_active: true,
        })
        .select("id,integration_id,tenant_id,webhook_url,webhook_secret,events,is_active,last_triggered_at,failed_attempts,created_at")
        .single();

      if (error) throw error;
      return data as WebhookRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhooks-pj"] }),
    onError: () => toast({ title: "Erro ao criar webhook", variant: "destructive" }),
  });
}

export function useToggleWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any)
        .from("integration_webhooks")
        .update({ is_active, failed_attempts: is_active ? 0 : undefined })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhooks-pj"] }),
    onError: () => toast({ title: "Erro ao atualizar webhook", variant: "destructive" }),
  });
}

export function useDeleteWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("integration_webhooks")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["webhooks-pj"] });
      toast({ title: "Webhook removido" });
    },
    onError: () => toast({ title: "Erro ao remover webhook", variant: "destructive" }),
  });
}

export function useWebhookDeliveryLogs(webhookId?: string | null) {
  return useQuery({
    queryKey: ["webhook-delivery-logs", webhookId],
    staleTime: 15_000,
    queryFn: async () => {
      const tenantId = await getUserTenantId();
      if (!tenantId) return [];

      let q = (supabase as any)
        .from("webhook_delivery_logs")
        .select("id,tenant_id,webhook_id,event,payload,response_status,response_body,attempt,delivered_at,next_retry_at,created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(200);

      if (webhookId) q = q.eq("webhook_id", webhookId);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}
