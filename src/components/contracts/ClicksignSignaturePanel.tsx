import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Send, Trash2, Plus, ShieldCheck, FileText, Download, AlertTriangle, ExternalLink, Loader2,
} from "lucide-react";

interface Props {
  contractId: string;
  contract: any;
  onReload: () => void;
}

interface SignerInput { email: string; name: string; }

const statusColors: Record<string, string> = {
  Unsigned: "bg-muted text-muted-foreground",
  Pending: "bg-yellow-500/20 text-yellow-400",
  PartiallySigned: "bg-blue-500/20 text-blue-400",
  Signed: "bg-green-500/20 text-green-400",
  Cancelado: "bg-destructive/20 text-destructive",
  Expirado: "bg-destructive/20 text-destructive",
};

export default function ClicksignSignaturePanel({ contractId, contract, onReload }: Props) {
  const { toast } = useToast();
  const [integrationConfigured, setIntegrationConfigured] = useState<boolean | null>(null);
  const [signers, setSigners] = useState<SignerInput[]>([{ email: "", name: "" }]);
  const [serverSigners, setServerSigners] = useState<any[]>([]);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const sent = !!contract.clicksign_document_key;
  const signed = contract.signature_status === "Signed";

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("integrations")
        .select("id")
        .eq("slug", "clicksign")
        .eq("is_active", true)
        .maybeSingle();
      setIntegrationConfigured(!!data);
    })();

    const loadSigners = async () => {
      const { data } = await supabase
        .from("contract_signers")
        .select("*")
        .eq("contract_id", contractId)
        .order("signing_order");
      setServerSigners(data || []);
    };
    loadSigners();

    const channel = supabase
      .channel(`contract-${contractId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "contracts", filter: `id=eq.${contractId}` },
        () => onReload(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contract_signers", filter: `contract_id=eq.${contractId}` },
        () => loadSigners(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [contractId, onReload]);

  const addSigner = () => setSigners([...signers, { email: "", name: "" }]);
  const removeSigner = (i: number) => setSigners(signers.filter((_, idx) => idx !== i));
  const updateSigner = (i: number, key: keyof SignerInput, value: string) => {
    const next = [...signers];
    next[i] = { ...next[i], [key]: value };
    setSigners(next);
  };

  const handleGeneratePdf = async () => {
    setPdfGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-contract", {
        body: { contract_id: contractId },
      });
      if (error) throw error;
      if (data?.success) {
        toast({ title: "PDF gerado com sucesso!" });
        onReload();
      } else {
        toast({ title: data?.error || "Erro ao gerar PDF", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro ao gerar documento", variant: "destructive" });
    } finally {
      setPdfGenerating(false);
    }
  };

  const handleSend = async () => {
    const valid = signers.filter((s) => s.email.includes("@") && s.name.trim().length > 0);
    if (valid.length === 0) {
      toast({ title: "Adicione ao menos um signatário válido", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("clicksign-send", {
        body: {
          contract_id: contractId,
          signers: valid.map((s, idx) => ({ email: s.email.trim(), name: s.name.trim(), signing_order: idx + 1 })),
        },
      });
      if (error) throw error;
      if (data?.success) {
        toast({ title: "Contrato enviado para Clicksign!", description: "Os signatários receberão um e-mail." });
        onReload();
      } else {
        toast({ title: data?.error || "Erro ao enviar", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: e?.message || "Erro ao enviar para Clicksign", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleDownloadSigned = async () => {
    if (!contract.document_url) return;
    setDownloading(true);
    try {
      const { data } = await supabase.storage
        .from("signed-contracts")
        .createSignedUrl(contract.document_url, 60);
      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank");
      } else {
        // fallback to axis-contracts (in case of older PDFs)
        const { data: alt } = await supabase.storage
          .from("axis-contracts")
          .createSignedUrl(contract.document_url, 60);
        if (alt?.signedUrl) window.open(alt.signedUrl, "_blank");
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Integration warning */}
      {integrationConfigured === false && (
        <Card className="border-yellow-500/40 bg-yellow-500/5">
          <CardContent className="py-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-semibold text-yellow-300">Clicksign não configurado</p>
              <p className="text-muted-foreground">
                Configure o Access Token + HMAC Secret em <strong>Configurações → Integrações → Clicksign</strong> para
                habilitar o envio de contratos para assinatura digital.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Status da Assinatura</span>
            <Badge className={statusColors[contract.signature_status] || ""}>{contract.signature_status}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          {contract.clicksign_sent_at && (
            <p>Enviado em {new Date(contract.clicksign_sent_at).toLocaleString("pt-BR")}</p>
          )}
          {contract.signed_at && (
            <p>Concluído em {new Date(contract.signed_at).toLocaleString("pt-BR")}</p>
          )}
          {signed && (
            <Button size="sm" variant="outline" className="mt-3" onClick={handleDownloadSigned} disabled={downloading}>
              {downloading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Download className="mr-2 h-3 w-3" />}
              Baixar contrato assinado
            </Button>
          )}
        </CardContent>
      </Card>

      {/* 1. PDF */}
      <Card className="border-border">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> 1. Documento PDF</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Gere o PDF do contrato antes de enviar para a Clicksign.</p>
          <div className="flex items-center gap-3">
            <Button onClick={handleGeneratePdf} disabled={pdfGenerating || sent}>
              {pdfGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
              {contract.document_url ? "Regenerar PDF" : "Gerar PDF"}
            </Button>
            {contract.document_url && (
              <span className="text-xs text-muted-foreground">✓ PDF disponível</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 2. Signatários */}
      {!sent && (
        <Card className="border-border">
          <CardHeader><CardTitle className="text-base">2. Signatários</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {signers.map((s, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nome completo</Label>
                  <Input value={s.name} onChange={(e) => updateSigner(i, "name", e.target.value)} placeholder="João Silva" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">E-mail</Label>
                  <Input type="email" value={s.email} onChange={(e) => updateSigner(i, "email", e.target.value)} placeholder="joao@empresa.com" />
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeSigner(i)} disabled={signers.length === 1}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addSigner}>
              <Plus className="mr-2 h-3 w-3" /> Adicionar signatário
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 3. Send */}
      {!sent && (
        <Card className="border-border">
          <CardContent className="py-4">
            <Button
              onClick={handleSend}
              disabled={sending || !contract.document_url || integrationConfigured === false}
              className="w-full"
              size="lg"
            >
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Enviar para Clicksign
            </Button>
            {!contract.document_url && (
              <p className="text-xs text-muted-foreground mt-2 text-center">Gere o PDF antes de enviar.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Server signers */}
      {serverSigners.length > 0 && (
        <Card className="border-border">
          <CardHeader><CardTitle className="text-base">Signatários Enviados</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assinado em</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {serverSigners.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.full_name}</TableCell>
                    <TableCell className="text-sm">{s.email}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          s.status === "signed"
                            ? "bg-green-500/20 text-green-400"
                            : s.status === "refused"
                              ? "bg-destructive/20 text-destructive"
                              : "bg-yellow-500/20 text-yellow-400"
                        }
                      >
                        {s.status === "signed" ? "Assinado" : s.status === "refused" ? "Recusado" : "Pendente"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {s.signed_at ? new Date(s.signed_at).toLocaleString("pt-BR") : "—"}
                    </TableCell>
                    <TableCell>
                      {s.signing_url && s.status !== "signed" && (
                        <a href={s.signing_url} target="_blank" rel="noopener noreferrer" className="text-primary text-xs flex items-center gap-1 hover:underline">
                          Link <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
