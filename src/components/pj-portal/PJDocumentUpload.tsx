import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, FolderOpen, FileText, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { usePJSession } from "./PJPortalLayout";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

const BUCKET = "pj-documents";
const ACCEPTED = ["application/pdf", "image/jpeg", "image/png"];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const DOC_TYPES = [
  { value: "contrato",     label: "Contrato" },
  { value: "rg_cnh",       label: "RG / CNH" },
  { value: "comprovante",  label: "Comprovante" },
  { value: "outros",       label: "Outros" },
];

interface StorageFile {
  name: string;
  docType: string;
  path: string;
  updated_at: string | null;
  metadata: Record<string, unknown>;
}

export default function PJDocumentUpload() {
  const { tenantId, pjId } = usePJSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [docType, setDocType] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filterDocType, setFilterDocType] = useState("todos");

  // List existing documents (all doc_types)
  const { data: documents = [], isLoading: loadingDocs } = useQuery({
    queryKey: ["pj-documents", tenantId, pjId],
    enabled: !!tenantId && !!pjId,
    staleTime: 30_000,
    queryFn: async () => {
      const results: StorageFile[] = [];
      for (const dt of DOC_TYPES) {
        const { data } = await supabase.storage
          .from(BUCKET)
          .list(`${tenantId}/${pjId}/${dt.value}`, { limit: 100, sortBy: { column: "updated_at", order: "desc" } });
        if (data) {
          results.push(
            ...data
              .filter((f) => f.name !== ".emptyFolderPlaceholder")
              .map((f) => ({
                name: f.name,
                docType: dt.value,
                path: `${tenantId}/${pjId}/${dt.value}/${f.name}`,
                updated_at: f.updated_at ?? null,
                metadata: f.metadata as Record<string, unknown>,
              }))
          );
        }
      }
      return results;
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return setSelectedFile(null);

    if (!ACCEPTED.includes(file.type)) {
      toast({ title: "Tipo inválido", description: "Aceito apenas PDF, JPG ou PNG.", variant: "destructive" });
      e.target.value = "";
      return setSelectedFile(null);
    }
    if (file.size > MAX_BYTES) {
      toast({ title: "Arquivo muito grande", description: "Tamanho máximo: 10 MB.", variant: "destructive" });
      e.target.value = "";
      return setSelectedFile(null);
    }
    setSelectedFile(file);
  }

  async function handleUpload() {
    if (!selectedFile || !docType) return;

    setUploading(true);
    const ext = selectedFile.name.split(".").pop();
    const timestamp = Date.now();
    const safeName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${tenantId}/${pjId}/${docType}/${timestamp}_${safeName}`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, selectedFile, {
      contentType: selectedFile.type,
      upsert: false,
    });

    setUploading(false);

    if (error) {
      toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Documento enviado com sucesso!" });
    setSelectedFile(null);
    setDocType("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    queryClient.invalidateQueries({ queryKey: ["pj-documents", tenantId, pjId] });
  }

  function getPublicUrl(path: string) {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  const filtered = filterDocType === "todos" ? documents : documents.filter((d) => d.docType === filterDocType);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Documentos</h1>
        <p className="text-muted-foreground">Envie e gerencie seus documentos</p>
      </div>

      {/* Upload form */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold">Enviar novo documento</h2>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1.5 min-w-[160px]">
            <Label className="text-xs text-muted-foreground">Tipo de documento</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map((dt) => (
                  <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 flex-1 min-w-[220px]">
            <Label className="text-xs text-muted-foreground">
              Arquivo — PDF, JPG ou PNG (máx. 10 MB)
            </Label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
            />
          </div>

          <Button
            onClick={handleUpload}
            disabled={!docType || !selectedFile || uploading}
            size="sm"
            className="gap-2"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Enviando..." : "Enviar"}
          </Button>
        </div>
      </div>

      {/* Document list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Documentos enviados</h2>
          <Select value={filterDocType} onValueChange={setFilterDocType}>
            <SelectTrigger className="h-7 text-xs w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {DOC_TYPES.map((dt) => (
                <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loadingDocs ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
            Carregando documentos...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-muted-foreground rounded-lg border border-dashed border-border">
            <FolderOpen className="h-8 w-8 opacity-30" />
            <p className="text-sm">Nenhum documento enviado</p>
          </div>
        ) : (
          <div className="rounded-lg border border-border divide-y divide-border">
            {filtered.map((doc) => {
              const dtLabel = DOC_TYPES.find((d) => d.value === doc.docType)?.label ?? doc.docType;
              return (
                <div key={doc.path} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/20 transition-colors">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.name}</p>
                    {doc.updated_at && (
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(doc.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">{dtLabel}</Badge>
                  <a
                    href={getPublicUrl(doc.path)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0"
                  >
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Baixar">
                      <Download className="h-3.5 w-3.5" />
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
