import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getUserTenantId } from "@/lib/getUserTenantId";

export interface PJDocument {
  id: string;
  tenant_id: string;
  pj_id: string;
  pj_name: string | null;
  document_type_id: string;
  document_type_name: string | null;
  document_number: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  file_url: string;
  validation_status: string;
  current_version: number;
  created_at: string;
  updated_at: string;
}

export interface PJDocumentVersion {
  id: string;
  pj_document_id: string;
  version_number: number;
  file_url: string;
  uploaded_by: string | null;
  uploader_name: string | null;
  created_at: string;
}

export interface PJDocumentFilters {
  pjId?: string;
  documentTypeId?: string;
}

export interface UploadPJDocumentInput {
  pjId: string;
  documentTypeId: string;
  documentNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  file: File;
}

const BUCKET = "pj-documents";
const MAX_BYTES = 10 * 1024 * 1024;

export type DocStatus = "valido" | "vencendo" | "vencido" | "sem_validade";

export function getDocStatus(expiryDate: string | null): DocStatus {
  if (!expiryDate) return "sem_validade";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  if (expiry < today) return "vencido";
  const thirtyDays = new Date(today);
  thirtyDays.setDate(thirtyDays.getDate() + 30);
  if (expiry <= thirtyDays) return "vencendo";
  return "valido";
}

export const DOC_STATUS_CONFIG: Record<DocStatus, { label: string; className: string }> = {
  valido:       { label: "Válido",       className: "bg-green-500/15 text-green-600 border-green-500/30" },
  vencendo:     { label: "Vencendo",     className: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30" },
  vencido:      { label: "Vencido",      className: "bg-red-500/15 text-red-500 border-red-500/30" },
  sem_validade: { label: "Sem validade", className: "bg-muted text-muted-foreground border-border" },
};

export function usePJDocuments(filters: PJDocumentFilters = {}) {
  return useQuery({
    queryKey: ["pj-documents", filters],
    staleTime: 2 * 60_000,
    queryFn: async () => {
      let q = (supabase as any)
        .from("pj_documents")
        .select("*, crm_accounts(name), pj_document_types(name)")
        .order("updated_at", { ascending: false });

      if (filters.pjId) q = q.eq("pj_id", filters.pjId);
      if (filters.documentTypeId) q = q.eq("document_type_id", filters.documentTypeId);

      const { data, error } = await q;
      if (error) {
        console.error("[usePJDocuments]", error);
        return [];
      }
      return ((data as any[]) ?? []).map((r) => ({
        ...r,
        pj_name: (r.crm_accounts as any)?.name ?? null,
        document_type_name: (r.pj_document_types as any)?.name ?? null,
      })) as PJDocument[];
    },
  });
}

export function usePJDocumentVersions(pjDocumentId: string) {
  return useQuery({
    queryKey: ["pj-document-versions", pjDocumentId],
    enabled: !!pjDocumentId,
    queryFn: async () => {
      const { data: versions, error } = await (supabase as any)
        .from("pj_document_versions")
        .select("*")
        .eq("pj_document_id", pjDocumentId)
        .order("version_number", { ascending: false });
      if (error) throw error;
      if (!versions || (versions as any[]).length === 0) return [] as PJDocumentVersion[];

      const uploaderIds = [...new Set((versions as any[]).map((v) => v.uploaded_by).filter(Boolean))];
      const { data: profiles } = await (supabase as any)
        .from("profiles")
        .select("id, full_name")
        .in("id", uploaderIds);

      const nameMap = new Map<string, string>((profiles ?? []).map((p: any) => [p.id, p.full_name]));

      return (versions as any[]).map((v) => ({
        ...v,
        uploader_name: nameMap.get(v.uploaded_by) ?? null,
      })) as PJDocumentVersion[];
    },
  });
}

export function useUploadPJDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UploadPJDocumentInput) => {
      const tenantId = await getUserTenantId();
      if (!tenantId) throw new Error("Tenant não encontrado");
      if (input.file.size > MAX_BYTES) throw new Error("Arquivo excede 10 MB");

      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id ?? null;

      // Upload file to storage
      const ext = input.file.name.split(".").pop() ?? "bin";
      const ts = Date.now();
      const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${tenantId}/${input.pjId}/docs/${input.documentTypeId}/${ts}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, input.file, { upsert: false, contentType: input.file.type });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);

      // Check if document already exists for this pj + type
      const { data: existing } = await (supabase as any)
        .from("pj_documents")
        .select("id, current_version")
        .eq("pj_id", input.pjId)
        .eq("document_type_id", input.documentTypeId)
        .maybeSingle();

      if (!existing) {
        // Create new document record
        const { data: newDoc, error: insertError } = await (supabase as any)
          .from("pj_documents")
          .insert({
            tenant_id: tenantId,
            pj_id: input.pjId,
            document_type_id: input.documentTypeId,
            document_number: input.documentNumber || null,
            issue_date: input.issueDate || null,
            expiry_date: input.expiryDate || null,
            file_url: publicUrl,
            validation_status: "pendente",
            current_version: 1,
          })
          .select("id")
          .single();
        if (insertError) throw insertError;

        // Create version record v1
        await (supabase as any).from("pj_document_versions").insert({
          pj_document_id: newDoc.id,
          version_number: 1,
          file_url: publicUrl,
          uploaded_by: userId,
        });
      } else {
        // Update existing document (new version)
        const newVersion = (existing.current_version ?? 1) + 1;
        const { error: updateError } = await (supabase as any)
          .from("pj_documents")
          .update({
            file_url: publicUrl,
            document_number: input.documentNumber || null,
            issue_date: input.issueDate || null,
            expiry_date: input.expiryDate || null,
            current_version: newVersion,
            validation_status: "pendente",
          })
          .eq("id", existing.id);
        if (updateError) throw updateError;

        // Create new version record
        await (supabase as any).from("pj_document_versions").insert({
          pj_document_id: existing.id,
          version_number: newVersion,
          file_url: publicUrl,
          uploaded_by: userId,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pj-documents"] });
    },
  });
}
