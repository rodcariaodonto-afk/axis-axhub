import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Props {
  nfApprovalId: string;
  disabled?: boolean;
  onDone?: (status: string) => void;
}

export function SefazRevalidateButton({ nfApprovalId, disabled, onDone }: Props) {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  async function handleRevalidate() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("validate-nf-sefaz", {
        body: { nf_approval_id: nfApprovalId },
      });
      if (error) throw new Error(error.message ?? "Erro ao validar");

      const status: string = (data as any)?.status ?? "sefaz_indisponivel";
      const messages: Record<string, string> = {
        validado_sefaz:     "NF validada na SEFAZ",
        invalido_sefaz:     "NF inválida na SEFAZ",
        sefaz_indisponivel: "SEFAZ indisponível — tente novamente",
        nao_configurado:    "Token Focus NFe não configurado",
        nao_verificado:     "chave_nfe não disponível",
      };

      if (status === "validado_sefaz") {
        toast.success(messages[status]);
      } else if (status === "invalido_sefaz") {
        toast.error(messages[status]);
      } else {
        toast.warning(messages[status] ?? status);
      }

      queryClient.invalidateQueries({ queryKey: ["nf-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["nf-approval", nfApprovalId] });
      onDone?.(status);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao revalidar SEFAZ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5 text-xs"
      disabled={disabled || loading}
      onClick={handleRevalidate}
    >
      <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
      {loading ? "Validando..." : "Revalidar SEFAZ"}
    </Button>
  );
}
