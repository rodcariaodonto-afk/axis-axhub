import { useState } from "react";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Upload, Search, History, SlidersHorizontal, FileText, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  usePJDocuments,
  useUploadPJDocument,
  getDocStatus,
  DOC_STATUS_CONFIG,
  type PJDocument,
  type PJDocumentFilters,
} from "@/hooks/usePJDocuments";
import { usePJDocumentTypes } from "@/hooks/usePJDocumentTypes";
import { usePJProviders } from "@/hooks/useRepasseAdmin";
import { DocumentVersionHistory } from "./DocumentVersionHistory";

const uploadSchema = z.object({
  pjId: z.string().min(1, "Selecione o PJ"),
  documentTypeId: z.string().min(1, "Selecione o tipo"),
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

interface UploadDialogProps {
  open: boolean;
  onClose: () => void;
  initialPjId?: string;
  initialTypeId?: string;
}

function UploadDocumentDialog({ open, onClose, initialPjId, initialTypeId }: UploadDialogProps) {
  const { toast } = useToast();
  const { data: types = [] } = usePJDocumentTypes();
  const { data: providers = [] } = usePJProviders();
  const upload = useUploadPJDocument();

  const [pjId, setPjId] = useState(initialPjId ?? "");
  const [typeId, setTypeId] = useState(initialTypeId ?? "");
  const [docNumber, setDocNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit() {
    const result = uploadSchema.safeParse({ pjId, documentTypeId: typeId, documentNumber: docNumber || undefined, issueDate: issueDate || undefined, expiryDate: expiryDate || undefined, file: file as File });
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.errors.forEach((e) => { errs[String(e.path[0])] = e.message; });
      setErrors(errs);
      return;
    }
    setErrors({});
    try {
      await upload.mutateAsync({
        pjId: result.data.pjId,
        documentTypeId: result.data.documentTypeId,
        documentNumber: result.data.documentNumber,
        issueDate: result.data.issueDate,
        expiryDate: result.data.expiryDate,
        file: result.data.file,
      });
      toast({ title: "Documento enviado com sucesso!" });
      onClose();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro no upload", description: e.message });
    }
  }

  // Auto-calculate expiry from validity_days when type is selected
  function handleTypeChange(v: string) {
    setTypeId(v);
    if (issueDate && v) {
      const selectedType = types.find((t) => t.id === v);
      if (selectedType?.validity_days && issueDate) {
        const issue = new Date(issueDate);
        issue.setDate(issue.getDate() + selectedType.validity_days);
        setExpiryDate(issue.toISOString().slice(0, 10));
      }
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

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar Documento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>PJ *</Label>
            <Select value={pjId} onValueChange={setPjId}>
              <SelectTrigger><SelectValue placeholder="Selecione o PJ..." /></SelectTrigger>
              <SelectContent>
                {providers.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.pjId && <p className="text-xs text-destructive">{errors.pjId}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Tipo de documento *</Label>
            <Select value={typeId} onValueChange={handleTypeChange}>
              <SelectTrigger><SelectValue placeholder="Selecione o tipo..." /></SelectTrigger>
              <SelectContent>
                {types.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.documentTypeId && <p className="text-xs text-destructive">{errors.documentTypeId}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Número do documento</Label>
            <Input value={docNumber} onChange={(e) => setDocNumber(e.target.value)} placeholder="Opcional" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Data de emissão</Label>
              <Input type="date" value={issueDate} onChange={(e) => handleIssueChange(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Validade</Label>
              <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Arquivo * (PDF, JPG ou PNG, máx. 10 MB)</Label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
            />
            {errors.file && <p className="text-xs text-destructive">{errors.file}</p>}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={upload.isPending}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={upload.isPending} className="gap-2">
            {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {upload.isPending ? "Enviando..." : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface PJDocumentManagerProps {
  initialPjId?: string;
}

export function PJDocumentManager({ initialPjId }: PJDocumentManagerProps = {}) {
  const [filters, setFilters] = useState<PJDocumentFilters>(
    initialPjId ? { pjId: initialPjId } : {}
  );
  const [filtersOpen, setFiltersOpen] = useState(!!initialPjId);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadForDoc, setUploadForDoc] = useState<{ pjId: string; typeId: string } | null>(null);
  const [historyDoc, setHistoryDoc] = useState<PJDocument | null>(null);

  const { data: docs = [], isLoading } = usePJDocuments(filters);
  const { data: types = [] } = usePJDocumentTypes();
  const { data: providers = [] } = usePJProviders();

  const hasActiveFilters = !!(filters.pjId || filters.documentTypeId);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={filtersOpen ? "default" : "outline"}
          className="h-8 gap-1.5"
          onClick={() => setFiltersOpen((v) => !v)}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />Filtros
          {hasActiveFilters && (
            <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">!</span>
          )}
        </Button>
        {hasActiveFilters && (
          <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground" onClick={() => setFilters({})}>
            Limpar
          </Button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {isLoading ? "..." : `${docs.length} documento${docs.length !== 1 ? "s" : ""}`}
        </span>
        <Button size="sm" className="gap-2" onClick={() => { setUploadForDoc(null); setUploadOpen(true); }}>
          <Upload className="h-4 w-4" />Enviar documento
        </Button>
      </div>

      {filtersOpen && (
        <div className="flex flex-wrap gap-3 rounded-lg border border-border bg-muted/30 p-3">
          <Select
            value={filters.pjId ?? "todos"}
            onValueChange={(v) => setFilters((f) => ({ ...f, pjId: v === "todos" ? undefined : v }))}
          >
            <SelectTrigger className="h-8 text-sm w-52"><SelectValue placeholder="Filtrar por PJ" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os PJ</SelectItem>
              {providers.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select
            value={filters.documentTypeId ?? "todos"}
            onValueChange={(v) => setFilters((f) => ({ ...f, documentTypeId: v === "todos" ? undefined : v }))}
          >
            <SelectTrigger className="h-8 text-sm w-52"><SelectValue placeholder="Tipo de documento" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {types.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
          Carregando documentos...
        </div>
      ) : docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
          <Search className="h-8 w-8 opacity-30" />
          <p className="text-sm">Nenhum documento encontrado</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border bg-muted/40">
                <TableHead>PJ</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Número</TableHead>
                <TableHead>Emissão</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Versão</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((doc) => {
                const status = getDocStatus(doc.expiry_date);
                const cfg = DOC_STATUS_CONFIG[status];
                return (
                  <TableRow key={doc.id} className="border-border hover:bg-accent/20">
                    <TableCell className="font-medium text-sm">{doc.pj_name ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        {doc.document_type_name ?? "—"}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-mono">{doc.document_number ?? "—"}</TableCell>
                    <TableCell className="text-sm">{fmtDate(doc.issue_date)}</TableCell>
                    <TableCell className="text-sm">{fmtDate(doc.expiry_date)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-xs", cfg.className)}>{cfg.label}</Badge>
                    </TableCell>
                    <TableCell className="text-center text-sm font-mono">v{doc.current_version}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          title="Histórico de versões"
                          onClick={() => setHistoryDoc(doc)}
                        >
                          <History className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          title="Upload nova versão"
                          onClick={() => { setUploadForDoc({ pjId: doc.pj_id, typeId: doc.document_type_id }); setUploadOpen(true); }}
                        >
                          <Upload className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <UploadDocumentDialog
        open={uploadOpen}
        onClose={() => { setUploadOpen(false); setUploadForDoc(null); }}
        initialPjId={uploadForDoc?.pjId}
        initialTypeId={uploadForDoc?.typeId}
      />

      <DocumentVersionHistory
        document={historyDoc}
        open={!!historyDoc}
        onClose={() => setHistoryDoc(null)}
      />
    </div>
  );
}
