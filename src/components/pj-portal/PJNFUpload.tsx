import { FileCheck } from "lucide-react";
import { NFUploadForm } from "@/components/nf-approval/NFUploadForm";
import { NFApprovalList } from "@/components/nf-approval/NFApprovalList";
import { usePJSession } from "./PJPortalLayout";
import { toast } from "sonner";

export default function PJNFUpload() {
  const { pjId } = usePJSession();

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
          <FileCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Notas Fiscais</h1>
          <p className="text-sm text-muted-foreground">Envie suas NFs para aprovação</p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5 space-y-1">
        <h2 className="text-sm font-semibold">Enviar nova Nota Fiscal</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Faça upload do XML (obrigatório) e PDF da NF. Os campos serão preenchidos automaticamente.
        </p>
        <NFUploadForm
          mode="portal"
          pjId={pjId}
          onSuccess={() => toast.success("NF enviada com sucesso")}
        />
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Suas Notas Fiscais</h2>
        <NFApprovalList />
      </div>
    </div>
  );
}
