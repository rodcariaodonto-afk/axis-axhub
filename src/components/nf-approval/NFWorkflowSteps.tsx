import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, XCircle, Clock, Minus, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useNFApprovalSteps, useApproveNFStep, type NFApprovalStep } from "@/hooks/useNFApprovals";

function StepIcon({ status }: { status: string }) {
  if (status === "aprovado") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (status === "rejeitado") return <XCircle className="h-4 w-4 text-red-500" />;
  if (status === "pendente") return <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function fmtDateTime(d: string | null) {
  if (!d) return null;
  try { return format(parseISO(d), "dd/MM/yyyy HH:mm", { locale: ptBR }); }
  catch { return d; }
}

interface Props {
  nfApprovalId: string;
  nfStatus: string;
  currentUserId?: string;
}

export function NFWorkflowSteps({ nfApprovalId, nfStatus, currentUserId }: Props) {
  const { data: steps = [], isLoading } = useNFApprovalSteps(nfApprovalId);
  const approve = useApproveNFStep();
  const { toast } = useToast();

  const [rejectingStepId, setRejectingStepId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState("");

  const isFinal = nfStatus === "aprovada" || nfStatus === "rejeitada";

  async function handleApprove(step: NFApprovalStep) {
    try {
      await approve.mutateAsync({ nf_approval_id: nfApprovalId, step_id: step.id, action: "approve" });
      toast({ title: "Step aprovado", description: `Nível ${step.step_number} aprovado com sucesso.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro ao aprovar", description: e.message });
    }
  }

  async function handleReject(step: NFApprovalStep) {
    if (!rejectComment.trim()) {
      toast({ variant: "destructive", title: "Motivo obrigatório", description: "Informe o motivo da rejeição." });
      return;
    }
    try {
      await approve.mutateAsync({
        nf_approval_id: nfApprovalId,
        step_id: step.id,
        action: "reject",
        comment: rejectComment,
      });
      toast({ title: "NF rejeitada", description: "A nota fiscal foi rejeitada e o PJ foi notificado." });
      setRejectingStepId(null);
      setRejectComment("");
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro ao rejeitar", description: e.message });
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Workflow de Aprovação</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Carregando...
          </div>
        ) : steps.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Nenhum step de aprovação encontrado.</p>
        ) : (
          <ol className="relative border-l border-border ml-2 space-y-6 pb-1">
            {steps.map((step) => {
              const isPending = step.status === "pendente";
              const isUserStep = step.approver_id === currentUserId;
              const canAct = isPending && isUserStep && !isFinal;
              const isRejectingThis = rejectingStepId === step.id;

              return (
                <li key={step.id} className="ml-6">
                  <span
                    className={cn(
                      "absolute -left-[11px] flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-background",
                      step.status === "aprovado" ? "bg-green-500/15" :
                      step.status === "rejeitado" ? "bg-red-500/15" :
                      step.status === "pendente" ? "bg-yellow-500/15" : "bg-muted"
                    )}
                  >
                    <StepIcon status={step.status} />
                  </span>

                  <div className="flex flex-col gap-1 pt-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">Nível {step.step_number}</span>
                      {step.approver_name && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />{step.approver_name}
                        </span>
                      )}
                    </div>

                    {step.status === "aprovado" && (
                      <p className="text-xs text-green-600">
                        Aprovado{step.acted_at ? ` em ${fmtDateTime(step.acted_at)}` : ""}
                      </p>
                    )}
                    {step.status === "rejeitado" && (
                      <div>
                        <p className="text-xs text-red-500">
                          Rejeitado{step.acted_at ? ` em ${fmtDateTime(step.acted_at)}` : ""}
                        </p>
                        {step.comment && (
                          <p className="text-xs text-muted-foreground mt-0.5">Motivo: {step.comment}</p>
                        )}
                      </div>
                    )}
                    {step.status === "aguardando" && (
                      <p className="text-xs text-muted-foreground">Aguardando steps anteriores</p>
                    )}
                    {step.status === "pendente" && !isUserStep && (
                      <p className="text-xs text-yellow-600">Aguardando aprovação</p>
                    )}

                    {canAct && !isRejectingThis && (
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          className="h-7 gap-1.5"
                          onClick={() => handleApprove(step)}
                          disabled={approve.isPending}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 gap-1.5"
                          onClick={() => setRejectingStepId(step.id)}
                          disabled={approve.isPending}
                        >
                          <XCircle className="h-3.5 w-3.5" />Rejeitar
                        </Button>
                      </div>
                    )}

                    {isRejectingThis && (
                      <div className="mt-2 space-y-2">
                        <Label className="text-xs">Motivo da rejeição *</Label>
                        <Textarea
                          className="text-sm min-h-[60px] resize-none"
                          placeholder="Descreva o motivo da rejeição..."
                          value={rejectComment}
                          onChange={(e) => setRejectComment(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7"
                            onClick={() => handleReject(step)}
                            disabled={approve.isPending}
                          >
                            Confirmar Rejeição
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7"
                            onClick={() => { setRejectingStepId(null); setRejectComment(""); }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
