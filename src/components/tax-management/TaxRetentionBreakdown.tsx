import { cn } from "@/lib/utils";

function fmtCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function fmtPct(v: number) {
  return `${v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

interface TaxLine {
  label: string;
  rate: number;
  value: number;
}

interface Props {
  valorBruto: number;
  ir: number;
  pis: number;
  cofins: number;
  inss: number;
  iss: number;
  csll: number;
  className?: string;
}

export function TaxRetentionBreakdown({ valorBruto, ir, pis, cofins, inss, iss, csll, className }: Props) {
  const round2 = (n: number) => Math.round(n * 100) / 100;

  const irValue     = round2(valorBruto * (ir / 100));
  const pisValue    = round2(valorBruto * (pis / 100));
  const cofinsValue = round2(valorBruto * (cofins / 100));
  const inssValue   = round2(valorBruto * (inss / 100));
  const issValue    = round2(valorBruto * (iss / 100));
  const csllValue   = round2(valorBruto * (csll / 100));

  const totalRetention = round2(irValue + pisValue + cofinsValue + inssValue + issValue + csllValue);
  const valorLiquido   = round2(valorBruto - totalRetention);

  const lines: TaxLine[] = [
    { label: "IR",     rate: ir,     value: irValue },
    { label: "PIS",    rate: pis,    value: pisValue },
    { label: "COFINS", rate: cofins, value: cofinsValue },
    { label: "INSS",   rate: inss,   value: inssValue },
    { label: "ISS",    rate: iss,    value: issValue },
    { label: "CSLL",   rate: csll,   value: csllValue },
  ].filter((l) => l.rate > 0);

  const hasRetentions = totalRetention > 0;

  return (
    <div className={cn("rounded-lg border border-border bg-muted/20 overflow-hidden text-sm", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Valor bruto</span>
        <span className="font-semibold">{fmtCurrency(valorBruto)}</span>
      </div>

      {/* Retention lines */}
      {hasRetentions ? (
        <div className="divide-y divide-border">
          {lines.map((line) => (
            <div key={line.label} className="flex items-center justify-between px-4 py-2">
              <div className="flex items-center gap-2">
                <span className="w-14 font-medium text-muted-foreground">{line.label}</span>
                <span className="text-xs text-muted-foreground">{fmtPct(line.rate)}</span>
              </div>
              <span className="text-red-500 font-mono">− {fmtCurrency(line.value)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 py-3 text-xs text-muted-foreground italic">
          Sem retenções (regime isento)
        </div>
      )}

      {/* Totals */}
      <div className="border-t border-border divide-y divide-border">
        {hasRetentions && (
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total retido</span>
            <span className="text-red-500 font-semibold font-mono">− {fmtCurrency(totalRetention)}</span>
          </div>
        )}
        <div className="flex items-center justify-between px-4 py-3 bg-primary/5">
          <span className="text-xs font-semibold uppercase tracking-wide">Valor líquido</span>
          <span className="font-bold text-primary font-mono">{fmtCurrency(valorLiquido)}</span>
        </div>
      </div>
    </div>
  );
}
