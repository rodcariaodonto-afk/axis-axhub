import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ExternalLink, Clock, User, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePJDocumentVersions, type PJDocument } from "@/hooks/usePJDocuments";

function fmtDateTime(d: string | null) {
  if (!d) return "—";
  try { return format(parseISO(d), "dd/MM/yyyy HH:mm", { locale: ptBR }); }
  catch { return d; }
}

interface Props {
  document: PJDocument | null;
  open: boolean;
  onClose: () => void;
}

export function DocumentVersionHistory({ document: doc, open, onClose }: Props) {
  const { data: versions = [], isLoading } = usePJDocumentVersions(doc?.id ?? "");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Histórico de Versões
          </DialogTitle>
          {doc && (
            <p className="text-sm text-muted-foreground">
              {doc.document_type_name ?? "Documento"} — {doc.pj_name ?? doc.pj_id}
            </p>
          )}
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-6">
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Carregando histórico...
          </div>
        ) : versions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Nenhuma versão encontrada.</p>
        ) : (
          <ol className="relative border-l border-border ml-2 space-y-5 py-2">
            {versions.map((v, idx) => (
              <li key={v.id} className="ml-6">
                <span className="absolute -left-[11px] flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 ring-2 ring-background">
                  <FileText className="h-3 w-3 text-primary" />
                </span>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs font-mono">
                        v{v.version_number}
                      </Badge>
                      {idx === 0 && (
                        <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                          Atual
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3" />{fmtDateTime(v.created_at)}
                    </p>
                    {v.uploader_name && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />{v.uploader_name}
                      </p>
                    )}
                  </div>
                  <a
                    href={v.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline shrink-0"
                  >
                    <ExternalLink className="h-3 w-3" />Ver arquivo
                  </a>
                </div>
              </li>
            ))}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}
