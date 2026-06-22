import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getUserTenantId } from "@/lib/getUserTenantId";
import { toast } from "@/hooks/use-toast";

export type ApiKeyScope =
  | "pj:read"
  | "pj:write"
  | "nf:read"
  | "nf:write"
  | "contracts:read"
  | "documents:read";

export const ALL_SCOPES: { value: ApiKeyScope; label: string; description: string }[] = [
  { value: "pj:read",        label: "PJ — Leitura",       description: "Listar e consultar prestadores" },
  { value: "pj:write",       label: "PJ — Escrita",        description: "Criar e editar prestadores" },
  { value: "nf:read",        label: "NF — Leitura",        description: "Consultar notas fiscais" },
  { value: "nf:write",       label: "NF — Submissão",      description: "Enviar notas fiscais" },
  { value: "contracts:read", label: "Contratos — Leitura", description: "Consultar contratos" },
  { value: "documents:read", label: "Documentos — Leitura",description: "Consultar documentos" },
];

export interface ApiKeyRow {
  id: string;
  tenant_id: string;
  user_id: string | null;
  name: string;
  api_key_masked: string;
  scopes: ApiKeyScope[];
  rate_limit: number;
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

function maskKey(raw: string): string {
  if (raw.length <= 12) return `${raw.slice(0, 4)}...`;
  return `${raw.slice(0, 8)}...${raw.slice(-4)}`;
}

function toRow(r: any): ApiKeyRow {
  return {
    id: r.id,
    tenant_id: r.tenant_id,
    user_id: r.user_id,
    name: r.name,
    api_key_masked: maskKey(r.api_key ?? ""),
    scopes: (r.scopes ?? []) as ApiKeyScope[],
    rate_limit: r.rate_limit ?? 60,
    is_active: r.is_active ?? true,
    last_used_at: r.last_used_at ?? null,
    expires_at: r.expires_at ?? null,
    created_at: r.created_at,
  };
}

export function useApiKeys() {
  return useQuery({
    queryKey: ["api-keys"],
    staleTime: 30_000,
    queryFn: async () => {
      const tenantId = await getUserTenantId();
      if (!tenantId) return [];
      const { data, error } = await (supabase as any)
        .from("api_keys")
        .select("id,tenant_id,user_id,name,api_key,scopes,rate_limit,is_active,last_used_at,expires_at,created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as any[]).map(toRow);
    },
  });
}

export interface CreateApiKeyInput {
  name: string;
  scopes: ApiKeyScope[];
  rate_limit: number;
  expires_at?: string | null;
}

export function useCreateApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateApiKeyInput): Promise<string> => {
      const tenantId = await getUserTenantId();
      if (!tenantId) throw new Error("Tenant não encontrado");
      const { data: { user } } = await supabase.auth.getUser();

      // Generate: UUID raw (128-bit entropy) formatted as hex string without dashes
      const rawUuid = crypto.randomUUID();
      const rawKey = `axk_${rawUuid.replace(/-/g, "")}`;

      const { error } = await (supabase as any).from("api_keys").insert({
        tenant_id: tenantId,
        user_id: user?.id ?? null,
        name: input.name,
        api_key: rawKey,
        scopes: input.scopes,
        rate_limit: input.rate_limit,
        is_active: true,
        expires_at: input.expires_at ?? null,
      });
      if (error) throw error;
      return rawKey;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["api-keys"] }),
    onError: () => toast({ title: "Erro ao criar chave", variant: "destructive" }),
  });
}

export function useRevokeApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("api_keys")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      toast({ title: "Chave revogada" });
    },
    onError: () => toast({ title: "Erro ao revogar chave", variant: "destructive" }),
  });
}

export function useDeleteApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("api_keys").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      toast({ title: "Chave removida" });
    },
    onError: () => toast({ title: "Erro ao remover chave", variant: "destructive" }),
  });
}

export function useApiRequestLogs(apiKeyId?: string | null) {
  return useQuery({
    queryKey: ["api-request-logs", apiKeyId],
    staleTime: 15_000,
    queryFn: async () => {
      const tenantId = await getUserTenantId();
      if (!tenantId) return [];
      let q = (supabase as any)
        .from("api_request_logs")
        .select("id,tenant_id,api_key_id,method,path,status_code,response_time_ms,ip_address,created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (apiKeyId) q = q.eq("api_key_id", apiKeyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}
