import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getDocStatus } from "./usePJDocuments";

export type ComplianceStatus = "conforme" | "pendente" | "nao_conforme";

export interface PJComplianceResult {
  pjId: string;
  pjName: string | null;
  totalMandatory: number;
  delivered: number;  // mandatory docs uploaded and valid (expiry null or future)
  expired: number;    // mandatory docs uploaded but past expiry
  missing: number;    // mandatory types with no doc uploaded
  status: ComplianceStatus;
}

export const COMPLIANCE_STATUS_CONFIG: Record<ComplianceStatus, { label: string; className: string }> = {
  conforme:     { label: "Conforme",     className: "bg-green-500/15 text-green-600 border-green-500/30" },
  pendente:     { label: "Pendente",     className: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30" },
  nao_conforme: { label: "Não conforme", className: "bg-red-500/15 text-red-500 border-red-500/30" },
};

export function useDocumentCompliance() {
  return useQuery({
    queryKey: ["document-compliance"],
    staleTime: 3 * 60_000,
    queryFn: async () => {
      const [
        { data: types },
        { data: pjs },
        { data: docs },
      ] = await Promise.all([
        (supabase as any).from("pj_document_types").select("id").eq("is_mandatory", true),
        (supabase as any).from("crm_accounts").select("id, name").eq("account_type", "pj_provider").eq("is_active", true).order("name"),
        (supabase as any).from("pj_documents").select("pj_id, document_type_id, expiry_date"),
      ]);

      const mandatoryTypeIds: string[] = (types ?? []).map((t: any) => t.id);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return ((pjs ?? []) as any[]).map((pj): PJComplianceResult => {
        const pjDocs: any[] = ((docs ?? []) as any[]).filter((d) => d.pj_id === pj.id);

        let delivered = 0;
        let expired = 0;
        let missing = 0;

        for (const typeId of mandatoryTypeIds) {
          const doc = pjDocs.find((d) => d.document_type_id === typeId);
          if (!doc) {
            missing++;
          } else {
            const status = getDocStatus(doc.expiry_date);
            if (status === "vencido") {
              expired++;
            } else {
              // válido, vencendo, ou sem_validade — tudo conta como entregue
              delivered++;
            }
          }
        }

        const total = mandatoryTypeIds.length;
        let status: ComplianceStatus;
        if (total === 0 || (missing === 0 && expired === 0)) {
          status = "conforme";
        } else if (expired > 0) {
          status = "nao_conforme";
        } else {
          status = "pendente";
        }

        return { pjId: pj.id, pjName: pj.name, totalMandatory: total, delivered, expired, missing, status };
      });
    },
  });
}

export function useDocumentExpiryAlerts(daysAhead = 30) {
  return useQuery({
    queryKey: ["document-expiry-alerts", daysAhead],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const limit = new Date(today);
      limit.setDate(limit.getDate() + daysAhead);

      const { data, error } = await (supabase as any)
        .from("pj_documents")
        .select("id, pj_id, document_type_id, expiry_date, crm_accounts(name), pj_document_types(name)")
        .not("expiry_date", "is", null)
        .gte("expiry_date", today.toISOString().slice(0, 10))
        .lte("expiry_date", limit.toISOString().slice(0, 10))
        .order("expiry_date", { ascending: true });

      if (error) {
        console.error("[useDocumentExpiryAlerts]", error);
        return [];
      }

      return ((data ?? []) as any[]).map((d) => ({
        id: d.id,
        pjId: d.pj_id,
        pjName: (d.crm_accounts as any)?.name ?? null,
        documentTypeName: (d.pj_document_types as any)?.name ?? null,
        expiryDate: d.expiry_date as string,
        daysUntilExpiry: Math.ceil((new Date(d.expiry_date).getTime() - today.getTime()) / 86_400_000),
      }));
    },
  });
}
