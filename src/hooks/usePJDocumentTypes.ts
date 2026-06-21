import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getUserTenantId } from "@/lib/getUserTenantId";

export interface PJDocumentType {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  is_mandatory: boolean;
  validity_days: number | null;
  created_at: string;
}

export interface UpsertDocumentTypeInput {
  id?: string;
  name: string;
  description?: string;
  is_mandatory: boolean;
  validity_days?: number | null;
}

export function usePJDocumentTypes() {
  return useQuery({
    queryKey: ["pj-document-types"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pj_document_types")
        .select("*")
        .order("name", { ascending: true });
      if (error) {
        console.error("[usePJDocumentTypes]", error);
        return [];
      }
      return (data ?? []) as PJDocumentType[];
    },
  });
}

export function useCreateDocumentType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<UpsertDocumentTypeInput, "id">) => {
      const tenantId = await getUserTenantId();
      if (!tenantId) throw new Error("Tenant não encontrado");
      const { error } = await (supabase as any).from("pj_document_types").insert({
        tenant_id: tenantId,
        name: input.name,
        description: input.description || null,
        is_mandatory: input.is_mandatory,
        validity_days: input.validity_days ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pj-document-types"] }),
  });
}

export function useUpdateDocumentType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpsertDocumentTypeInput & { id: string }) => {
      const { error } = await (supabase as any)
        .from("pj_document_types")
        .update({
          name: input.name,
          description: input.description || null,
          is_mandatory: input.is_mandatory,
          validity_days: input.validity_days ?? null,
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pj-document-types"] }),
  });
}

export function useDeleteDocumentType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("pj_document_types")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pj-document-types"] }),
  });
}
