import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, FileText, Loader2 } from "lucide-react";
import { useTaxRetentionForNF, useGenerateRPA } from "@/hooks/useTaxDashboard";
import { TaxRetentionBreakdown } from "./TaxRetentionBreakdown";
import { useTaxSettingsForPJ } from "@/hooks/useTaxSettings";

interface Props {
  nfApprovalId: string;
}

export function RPAGenerator({ nfApprovalId }: Props) {
  const { data: retention, isLoading } = useTaxRetentionForNF(nfApprovalId);
  const { data: taxSettings } = useTaxSettingsForPJ(retention?.pj_id ?? "");
  const generateRPA = useGenerateRPA();
  const { toast } = useToast();
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

  if (isLoading) return null;
  if (!retention) return null;

  const rpaUrl = generatedUrl ?? retention.rpa_url;

  async function handleGenerate() {
    try {
      const result = await generateRPA.mutateAsync(retention!.id);
      setGeneratedUrl(result.rpa_url);
      toast({ title: "RPA gerado com sucesso" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro ao gerar RPA", description: e.message });
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Retenções Fiscais / RPA</h3>
      </div>

      <TaxRetentionBreakdown
        valorBruto={retention.valor_bruto}
        ir={taxSettings?.aliquota_ir ?? 0}
        pis={taxSettings?.aliquota_pis ?? 0}
        cofins={taxSettings?.aliquota_cofins ?? 0}
        inss={taxSettings?.aliquota_inss ?? 0}
        iss={taxSettings?.aliquota_iss ?? 0}
        csll={taxSettings?.aliquota_csll ?? 0}
      />

      <div className="flex items-center gap-3">
        {!rpaUrl ? (
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerate}
            disabled={generateRPA.isPending}
            className="gap-2"
          >
            {generateRPA.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileText className="h-3.5 w-3.5" />
            )}
            {generateRPA.isPending ? "Gerando RPA..." : "Gerar RPA"}
          </Button>
        ) : (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerate}
              disabled={generateRPA.isPending}
              className="gap-2"
            >
              {generateRPA.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileText className="h-3.5 w-3.5" />
              )}
              Regerar RPA
            </Button>
            <a
              href={rpaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Baixar RPA (PDF)
            </a>
          </>
        )}
      </div>
    </div>
  );
}
