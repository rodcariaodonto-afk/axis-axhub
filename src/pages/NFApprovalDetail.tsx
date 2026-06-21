import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNFApprovalDetail } from "@/hooks/useNFApprovals";
import { NFApprovalDetailCard } from "@/components/nf-approval/NFApprovalDetail";
import { NFWorkflowSteps } from "@/components/nf-approval/NFWorkflowSteps";
import { useAuth } from "@/hooks/useAuth";
import PageLoader from "@/components/PageLoader";

export default function NFApprovalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: nf, isLoading, error } = useNFApprovalDetail(id!);

  if (isLoading) return <PageLoader />;

  if (error || !nf) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate("/nf-approvals")}>
          <ArrowLeft className="h-4 w-4" />Voltar
        </Button>
        <p className="text-muted-foreground text-sm">Nota fiscal não encontrada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="gap-2 -ml-2" onClick={() => navigate("/nf-approvals")}>
          <ArrowLeft className="h-4 w-4" />Voltar
        </Button>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
            <FileCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Detalhe da NF</h1>
            <p className="text-muted-foreground text-sm">NF {nf.nf_number} — {nf.pj_name ?? nf.pj_id}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <NFApprovalDetailCard nf={nf} />
        <NFWorkflowSteps
          nfApprovalId={nf.id}
          nfStatus={nf.status}
          currentUserId={user?.id}
        />
      </div>
    </div>
  );
}
