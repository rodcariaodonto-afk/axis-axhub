import { useState } from "react";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Upload, FolderOpen, FileText, ExternalLink, Loader2, Shield, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { usePJSession } from "./PJPortalLayout";
import { usePJDocumentTypes } from "@/hooks/usePJDocumentTypes";
import { usePJDocuments, useUploadPJDocument, getDocStatus, DOC_STATUS_CONFIG } from "@/hooks/usePJDocuments";

const uploadSchema = z.object({
  documentTypeId: z.string().min(1, "Selecione o tipo de documento"),
  documentNumber: z.string().optional(),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  file: z.instanceof(File, { message: "Selecione um arquivo" }),
});

function fmtDate(d: string | null) {
  if (!d) return "—";
  try { return format(parseISO(d), "dd/MM/yyyy", { locale: ptBR }); }
  catch { return d; }
}

export default function PJDocumentUpload() {
  const { tenantId, pjId } = usePJSession();
  const { toast } = useToast();

  const { data: types = [], isLoading: loadingTypes } = usePJDocumentTypes();
  const { data: docs = [], isLoading: loadingDocs } = usePJDocuments({ pjId });
  const upload = useUploadPJDocument();

  const [typeId, setTypeId] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleTypeChange(v: string) {
    setTypeId(v);
    const selectedType = types.find((t) => t.id === v);
    if (selectedType?.validity_days && issueDate) {
      const issue = new Date(issueDate);
      issue.setDate(issue.getDate() + selectedType.validity_days);
      setExpiryDate(issue.toISOString().slice(0, 10));
    }
  }

  function handleIssueChange(v: string) {
    setIssueDate(v);
    const selectedType = types.find((t) => t.id === typeId);
    if (selectedType?.validity_days && v) {
      const issue = new Date(v);
      issue.setDate(issue.getDate() + selectedType.validity_days);
      setExpiryDate(issue.toISOString().slice(0, 10));
    }
  }

  async function handleSubmit() {
    const result = uploadSchema.safeParse({ documentTypeId: typeId, documentNumber: docNumber || undefined, issueDate: issueDate || undefined, expiryDate: expiryDate || undefined, file: file as File });
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.errors.forEach((e) => { errs[String(e.path[0])] = e.message; });
      setErrors(errs);
      return;
    }
    setErrors({});
    try {
      await upload.mutateAsync({
        pjId,
        documentTypeId: result.data.documentTypeId,
        documentNumber: result.data.documentNumber,
        issueDate: result.data.issueDate,
        expiryDate: result.data.expiryDate,
        file: result.data.file,
      });
      toast({ title: "Documento enviado com sucesso!" });
      setTypeId(""); setDocNumber(""); setIssueDate(""); setExpiryDate(""); setFile(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro no upload", description: e.message });
    }
  }

  const selectedType = types.find((t) => t.id === typeId);
  const existingDoc = docs.find((d) => d.document_type_id === typeId);
  const isNewVersion = !!existingDoc;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Documentos</h1>
        <p className="text-muted-foreground">Envie e gerencie seus documentos</p>
      </div>

      {/* Upload form */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            {isNewVersion ? "Enviar nova versão" : "Enviar documento"}
          </h2>
          {isNewVersion && (
            <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30">
              v{(existingDoc?.current_version ?? 0) + 1} (nova versão)
            </Badge>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Tipo de documento *</Label>
            <Select value={typeId} onValueChange={handleTypeChange} disabled={loadingTypes}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder={loadingTypes ? "Carregando..." : "Selecione o tipo..."} />
              </SelectTrigger>
              <SelectContent>
                {types.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    <span className="flex items-center gap-2">
                      {t.name}
                      {t.is_mandatory && <Shield className="h-3 w-3 text-primary" />}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.documentTypeId && <p className="text-xs text-destructive">{errors.documentTypeId}</p>}
            {selectedType?.validity_days && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />Validade de {selectedType.validity_days} dias (calculada automaticamente)
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Número do documento</Label>
            <Input value={docNumber} onChange={(e) => setDocNumber(e.target.value)} placeholder="Opcional" className="h-9 text-sm" />
          </div>

          <div className="space-y-1.5">
            <Label>Data de emissão</Label>
            <Input type="date" value={issueDate} onChange={(e) => handleIssueChange(e.target.value)} className="h-9 text-sm" />
          </div>

          <div className="space-y-1.5">
            <Label>Validade</Label>
            <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="h-9 text-sm" />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Arquivo * (PDF, JPG ou PNG — máx. 10 MB)</Label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
            />
            {errors.file && <p className="text-xs text-destructive">{errors.file}</p>}
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={upload.isPending}
          size="sm"
          className="gap-2"
        >
          {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {upload.isPending ? "Enviando..." : isNewVersion ? "Enviar nova versão" : "Enviar documento"}
        </Button>
      </div>

      {/* Mandatory types checklist */}
      {types.some((t) => t.is_mandatory) && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Documentos obrigatórios</p>
          <div className="space-y-1.5">
            {types.filter((t) => t.is_mandatory).map((t) => {
              const doc = docs.find((d) => d.document_type_id === t.id);
              const status = doc ? getDocStatus(doc.expiry_date) : null;
              const cfg = status ? DOC_STATUS_CONFIG[status] : null;
              return (
                <div key={t.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    {t.name}
                  </div>
                  {doc ? (
                    <Badge variant="outline" className={cn("text-xs", cfg?.className)}>{cfg?.label}</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs bg-red-500/10 text-red-500 border-red-500/30">Pendente</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Document list */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Documentos enviados</h2>
        {loadingDocs ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
            Carregando documentos...
          </div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-muted-foreground rounded-lg border border-dashed border-border">
            <FolderOpen className="h-8 w-8 opacity-30" />
            <p className="text-sm">Nenhum documento enviado</p>
          </div>
        ) : (
          <div className="rounded-lg border border-border divide-y divide-border">
            {docs.map((doc) => {
              const status = getDocStatus(doc.expiry_date);
              const cfg = DOC_STATUS_CONFIG[status];
              return (
                <div key={doc.id} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/20 transition-colors">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{doc.document_type_name ?? "—"}</p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {doc.document_number && (
                        <span className="text-xs text-muted-foreground font-mono">{doc.document_number}</span>
                      )}
                      {doc.expiry_date && (
                        <span className="text-xs text-muted-foreground">
                          Validade: {fmtDate(doc.expiry_date)}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">v{doc.current_version}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className={cn("text-xs shrink-0", cfg.className)}>{cfg.label}</Badge>
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0"
                  >
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Ver arquivo">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
