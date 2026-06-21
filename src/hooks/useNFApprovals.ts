import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getUserTenantId } from "@/lib/getUserTenantId";

export interface NFApproval {
  id: string;
  tenant_id: string;
  pj_id: string;
  pj_name: string | null;
  nf_number: string;
  nf_series: string | null;
  nf_value: number;
  nf_date: string;
  nf_due_date: string | null;
  cnpj_emitente: string | null;
  xml_url: string | null;
  pdf_url: string | null;
  status: string;
  validation_errors: any | null;
  payable_id: string | null;
  approved_at: string | null;
  created_at: string;
}

export interface NFApprovalStep {
  id: string;
  tenant_id: string;
  nf_approval_id: string;
  step_number: number;
  approver_id: string;
  approver_name: string | null;
  status: string;
  comment: string | null;
  acted_at: string | null;
  created_at: string;
}

export interface NFApprovalFilters {
  pjId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateNFApprovalInput {
  pjId: string;
  nf_number: string;
  nf_series?: string;
  nf_value: number;
  nf_date: string;
  nf_due_date?: string;
  cnpj_emitente?: string;
  xmlFile?: File | null;
  pdfFile?: File | null;
}

export interface ParsedNFData {
  nf_number: string | null;
  nf_series: string | null;
  nf_value: number | null;
  nf_date: string | null;
  cnpj_emitente: string | null;
  validation_errors: string[];
}

const MAX_BYTES = 10 * 1024 * 1024;

async function uploadNFFile(
  tenantId: string,
  pjId: string,
  nfNumber: string,
  file: File,
  ext: "xml" | "pdf"
): Promise<string> {
  const ts = Date.now();
  const path = `${tenantId}/${pjId}/nf/${nfNumber}_${ts}.${ext}`;
  const { error } = await supabase.storage
    .from("pj-documents")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from("pj-documents").getPublicUrl(path);
  return publicUrl;
}

export function useNFApprovals(filters: NFApprovalFilters = {}) {
  return useQuery({
    queryKey: ["nf-approvals", filters],
    staleTime: 2 * 60_000,
    queryFn: async () => {
      let q = (supabase as any)
        .from("nf_approvals")
        .select("*, crm_accounts(name)")
        .order("created_at", { ascending: false });

      if (filters.pjId && filters.pjId !== "todos") q = q.eq("pj_id", filters.pjId);
      if (filters.status && filters.status !== "todos") q = q.eq("status", filters.status);
      if (filters.startDate) q = q.gte("nf_date", filters.startDate);
      if (filters.endDate) q = q.lte("nf_date", filters.endDate);

      const { data, error } = await q;
      if (error) {
        console.error("[useNFApprovals]", error);
        return [];
      }
      return ((data as any[]) ?? []).map((r) => ({
        ...r,
        pj_name: (r.crm_accounts as any)?.name ?? null,
      })) as NFApproval[];
    },
  });
}

export function useCreateNFApproval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateNFApprovalInput) => {
      const tenantId = await getUserTenantId();
      if (!tenantId) throw new Error("Tenant não encontrado");

      if (input.xmlFile && input.xmlFile.size > MAX_BYTES) throw new Error("XML excede 10 MB");
      if (input.pdfFile && input.pdfFile.size > MAX_BYTES) throw new Error("PDF excede 10 MB");

      let xmlUrl: string | null = null;
      let pdfUrl: string | null = null;

      if (input.xmlFile) {
        xmlUrl = await uploadNFFile(tenantId, input.pjId, input.nf_number, input.xmlFile, "xml");
      }
      if (input.pdfFile) {
        pdfUrl = await uploadNFFile(tenantId, input.pjId, input.nf_number, input.pdfFile, "pdf");
      }

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const userId = currentUser?.id ?? null;

      const { data: nfData, error } = await (supabase as any)
        .from("nf_approvals")
        .insert({
          tenant_id: tenantId,
          pj_id: input.pjId,
          nf_number: input.nf_number,
          nf_series: input.nf_series || null,
          nf_value: input.nf_value,
          nf_date: input.nf_date,
          nf_due_date: input.nf_due_date || null,
          cnpj_emitente: input.cnpj_emitente || null,
          xml_url: xmlUrl,
          pdf_url: pdfUrl,
          status: "pendente",
          created_by: userId,
        })
        .select("id")
        .single();
      if (error) throw error;

      // Create workflow steps automatically
      try {
        const { data: config } = await (supabase as any)
          .from("nf_workflow_config")
          .select("*")
          .eq("tenant_id", tenantId)
          .maybeSingle();

        const levels: number = config?.approval_levels ?? 1;
        const approverIds: (string | null)[] = [
          config?.level1_approver_id ?? null,
          config?.level2_approver_id ?? null,
          config?.level3_approver_id ?? null,
        ];

        const steps = Array.from({ length: levels }, (_, i) => ({
          tenant_id: tenantId,
          nf_approval_id: nfData.id,
          step_number: i + 1,
          approver_id: approverIds[i] ?? userId,
          status: i === 0 ? "pendente" : "aguardando",
        }));

        await (supabase as any).from("nf_approval_steps").insert(steps);
        await (supabase as any)
          .from("nf_approvals")
          .update({ status: "em_aprovacao" })
          .eq("id", nfData.id);
      } catch (stepErr) {
        console.error("[useCreateNFApproval] step creation failed:", stepErr);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["nf-approvals"] }),
  });
}

export function useNFApprovalDetail(id: string) {
  return useQuery({
    queryKey: ["nf-approval", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("nf_approvals")
        .select("*, crm_accounts(name)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return {
        ...data,
        pj_name: (data.crm_accounts as any)?.name ?? null,
      } as NFApproval;
    },
  });
}

export function useNFApprovalSteps(nfApprovalId: string) {
  return useQuery({
    queryKey: ["nf-approval-steps", nfApprovalId],
    enabled: !!nfApprovalId,
    queryFn: async () => {
      const { data: steps, error } = await (supabase as any)
        .from("nf_approval_steps")
        .select("*")
        .eq("nf_approval_id", nfApprovalId)
        .order("step_number", { ascending: true });
      if (error) throw error;
      if (!steps || (steps as any[]).length === 0) return [] as NFApprovalStep[];

      const approverIds = [...new Set((steps as any[]).map((s) => s.approver_id).filter(Boolean))];
      const { data: profiles } = await (supabase as any)
        .from("profiles")
        .select("id, full_name")
        .in("id", approverIds);

      const nameMap = new Map<string, string>((profiles ?? []).map((p: any) => [p.id, p.full_name]));

      return (steps as any[]).map((s) => ({
        ...s,
        approver_name: nameMap.get(s.approver_id) ?? null,
      })) as NFApprovalStep[];
    },
  });
}

export function useApproveNFStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      nf_approval_id: string;
      step_id: string;
      action: "approve" | "reject";
      comment?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("approve-nf-step", { body: input });
      if (error) throw new Error(error.message ?? "Erro ao processar aprovação");
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["nf-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["nf-approval", vars.nf_approval_id] });
      queryClient.invalidateQueries({ queryKey: ["nf-approval-steps", vars.nf_approval_id] });
    },
  });
}

// Calls validate-nf-xml edge function; reads file text client-side
export async function parseNFXml(file: File): Promise<ParsedNFData> {
  const xml = await file.text();
  const { data, error } = await supabase.functions.invoke("validate-nf-xml", {
    body: { xml },
  });
  if (error) throw new Error(error.message ?? "Erro ao processar XML");
  return data as ParsedNFData;
}
