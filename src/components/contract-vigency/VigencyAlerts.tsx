import { AlertTriangle, Clock, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useContractVigency } from "@/hooks/useContractVigency";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface VigencyAlertsProps {
  maxItems?: number;
  compact?: boolean;
}

export function VigencyAlerts({ maxItems = 5, compact = false }: VigencyAlertsProps) {
  const { contracts, counts, isLoading } = useContractVigency();

  const alertContracts = contracts
    .filter((c) => c.vigency === "vencido" || c.vigency === "vencendo_30d")
    .slice(0, maxItems);

  const totalAlerts = counts.vencido + counts.vencendo_30d;

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="h-4 bg-muted rounded animate-pulse w-40 mb-3" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-3 bg-muted rounded animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (totalAlerts === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
          <Clock className="h-4 w-4 text-green-500" />
        </div>
        <p className="text-sm text-muted-foreground">Nenhum contrato vencendo nos próximos 30 dias.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <span className="text-sm font-semibold">Alertas de Vigência</span>
          <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
            {totalAlerts}
          </Badge>
        </div>
        {!compact && (
          <Link
            to="/contracts/vigency"
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Ver todos <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      <div className="divide-y divide-border">
        {alertContracts.map((c) => (
          <div key={c.id} className="flex items-center gap-3 px-4 py-2.5">
            <div
              className={cn(
                "h-2 w-2 rounded-full shrink-0",
                c.vigency === "vencido" ? "bg-red-500" : "bg-yellow-500"
              )}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{c.name}</p>
              {c.account_name && (
                <p className="text-xs text-muted-foreground truncate">{c.account_name}</p>
              )}
            </div>
            <div className="shrink-0 text-right">
              {c.vigency === "vencido" ? (
                <span className="text-xs font-medium text-red-500">Vencido</span>
              ) : (
                <span className="text-xs font-medium text-yellow-600">
                  {c.days_until_expiry === 0 ? "Hoje" : `${c.days_until_expiry}d`}
                </span>
              )}
              {c.end_date && (
                <p className="text-[10px] text-muted-foreground">
                  {format(parseISO(c.end_date), "dd/MM/yy", { locale: ptBR })}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {totalAlerts > maxItems && (
        <div className="px-4 py-2 border-t border-border">
          <Link
            to="/contracts/vigency"
            className="flex items-center justify-center gap-1 text-xs text-primary hover:underline"
          >
            +{totalAlerts - maxItems} mais contratos <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
}
