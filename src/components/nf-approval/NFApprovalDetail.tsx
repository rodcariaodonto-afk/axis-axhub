import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ExternalLink, FileText, Building2, Calendar, DollarSign, Hash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { NFApproval } from "@/hooks/useNFApprovals";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  rascunho:     { label: "Rascunho",     className: "bg-muted text-muted-foreground border-border" },
  pendente:     { label: "Pendente",     className: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30" },
  em_aprovacao: { label: "Em aprovação", className: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  aprovada:     { label: "Aprovada",     className: "bg-green-500/15 text-green-600 border-green-500/30" },
  rejeitada:    { label: "Rejeitada",    className: "bg-red-500/15 text-red-500 border-red-500/30" },
};

function fmtDate(d: string | null) {
  if (!d) return "—";
  try { return format(parseISO(d), "dd/MM/yyyy", { locale: ptBR }); }
  catch { return d; }
}

function fmtCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

interface Props {
  nf: NFApproval;
}

export function NFApprovalDetailCard({ nf }: Props) {
  const cfg = STATUS_CONFIG[nf.status] ?? { label: nf.status, className: "" };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">
                NF {nf.nf_number}
                {nf.nf_series ? <span className="text-muted-foreground font-normal"> / Série {nf.nf_series}</span> : null}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">{nf.pj_name ?? nf.pj_id}</p>
            </div>
          </div>
          <Badge variant="outline" className={cn("text-xs shrink-0", cfg.className)}>{cfg.label}</Badge>
        </div>
      </CardHeader>

      <CardContent>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-3 w-3" />Valor
            </dt>
            <dd className="mt-1 text-sm font-semibold font-mono">{fmtCurrency(nf.nf_value)}</dd>
          </div>

          <div>
            <dt className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />Emissão
            </dt>
            <dd className="mt-1 text-sm">{fmtDate(nf.nf_date)}</dd>
          </div>

          <div>
            <dt className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />Vencimento
            </dt>
            <dd className="mt-1 text-sm">{fmtDate(nf.nf_due_date)}</dd>
          </div>

          {nf.cnpj_emitente && (
            <div>
              <dt className="text-xs text-muted-foreground flex items-center gap-1">
                <Building2 className="h-3 w-3" />CNPJ Emitente
              </dt>
              <dd className="mt-1 text-sm font-mono">{nf.cnpj_emitente}</dd>
            </div>
          )}

          <div>
            <dt className="text-xs text-muted-foreground flex items-center gap-1">
              <Hash className="h-3 w-3" />Submetida em
            </dt>
            <dd className="mt-1 text-sm">{fmtDate(nf.created_at)}</dd>
          </div>

          {nf.approved_at && (
            <div>
              <dt className="text-xs text-muted-foreground flex items-center gap-1">
                <Hash className="h-3 w-3" />Aprovada em
              </dt>
              <dd className="mt-1 text-sm">{fmtDate(nf.approved_at)}</dd>
            </div>
          )}

          {nf.payable_id && (
            <div className="col-span-2 sm:col-span-1">
              <dt className="text-xs text-muted-foreground">Payable vinculado</dt>
              <dd className="mt-1 text-xs font-mono text-muted-foreground">{nf.payable_id.slice(0, 8)}…</dd>
            </div>
          )}
        </dl>

        {(nf.xml_url || nf.pdf_url) && (
          <div className="mt-4 flex gap-4 pt-4 border-t border-border">
            {nf.xml_url && (
              <a
                href={nf.xml_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />XML NF-e
              </a>
            )}
            {nf.pdf_url && (
              <a
                href={nf.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />DANFE (PDF)
              </a>
            )}
          </div>
        )}

        {nf.validation_errors &&
          Array.isArray(nf.validation_errors) &&
          (nf.validation_errors as string[]).length > 0 && (
          <div className="mt-4 rounded-md bg-yellow-500/10 border border-yellow-500/30 p-3">
            <p className="text-xs font-medium text-yellow-600 mb-1">Alertas de validação</p>
            <ul className="text-xs text-yellow-600 space-y-0.5 list-disc list-inside">
              {(nf.validation_errors as string[]).map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
