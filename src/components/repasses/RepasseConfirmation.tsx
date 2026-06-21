import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useConfirmRepasse } from "@/hooks/useRepasseSchedule";

interface Props {
  repasseId: string;
  confirmedAt: string | null;
}

export function RepasseConfirmation({ repasseId, confirmedAt }: Props) {
  const { user } = useAuth();
  const confirm = useConfirmRepasse();
  const { toast } = useToast();

  if (confirmedAt) {
    let label = "Recebimento confirmado";
    try {
      label = `Recebido em ${format(parseISO(confirmedAt), "dd/MM/yyyy", { locale: ptBR })}`;
    } catch {}
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-green-600 font-medium">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {label}
      </span>
    );
  }

  async function handleConfirm() {
    if (!user?.id) return;
    try {
      await confirm.mutateAsync({ repasseId, userId: user.id });
      toast({ title: "Recebimento confirmado com sucesso" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro ao confirmar", description: e.message });
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="gap-1.5 h-7 text-xs"
      onClick={handleConfirm}
      disabled={confirm.isPending || !user}
    >
      {confirm.isPending
        ? <Loader2 className="h-3 w-3 animate-spin" />
        : <CheckCircle2 className="h-3 w-3" />}
      Confirmar recebimento
    </Button>
  );
}
