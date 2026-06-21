import { useState } from "react";
import { Copy, Check, QrCode, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Props {
  repasseId: string;
  existingPayload?: string | null;
  existingQrcode?: string | null;
}

export function PixPayloadGenerator({ repasseId, existingPayload, existingQrcode }: Props) {
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<string | null>(existingPayload ?? null);
  const [qrcode, setQrcode] = useState<string | null>(existingQrcode ?? null);
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  async function handleGenerate() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-pix-payload", {
        body: { pj_repasse_history_id: repasseId },
      });
      if (error) throw new Error(error.message ?? "Erro ao gerar PIX");
      if ((data as any)?.error) throw new Error((data as any).error);

      setPayload((data as any).payload);
      setQrcode((data as any).qrcode_base64);

      queryClient.invalidateQueries({ queryKey: ["repasses-admin"] });
      toast.success("Payload PIX gerado com sucesso");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao gerar PIX");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Payload copiado para a área de transferência");
    } catch {
      toast.error("Não foi possível copiar automaticamente");
    }
  }

  if (!payload) {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <QrCode className="h-10 w-10 text-muted-foreground opacity-40" />
        <p className="text-sm text-muted-foreground text-center">
          Nenhum payload PIX gerado ainda.
        </p>
        <Button size="sm" className="gap-2" onClick={handleGenerate} disabled={loading}>
          <QrCode className={`h-3.5 w-3.5 ${loading ? "animate-pulse" : ""}`} />
          {loading ? "Gerando..." : "Gerar PIX"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* QR Code */}
      {qrcode && (
        <div className="flex justify-center">
          <div className="rounded-lg border border-border p-3 bg-white inline-block">
            <img
              src={qrcode}
              alt="QR Code PIX"
              className="h-48 w-48"
            />
          </div>
        </div>
      )}

      {/* Payload copia-e-cola */}
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground font-medium">Código PIX copia e cola</p>
        <div className="flex gap-2">
          <div className="flex-1 rounded-md border border-border bg-muted/30 px-3 py-2 font-mono text-xs break-all text-foreground">
            {payload}
          </div>
          <Button variant="outline" size="sm" onClick={handleCopy} className="shrink-0 gap-1">
            {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copiado" : "Copiar"}
          </Button>
        </div>
      </div>

      {/* Regenerar */}
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={handleGenerate} disabled={loading} className="gap-1.5 text-xs text-muted-foreground">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Gerando..." : "Regerar PIX"}
        </Button>
      </div>
    </div>
  );
}
