import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ACCOUNTING_TYPE_COLORS, ACCOUNTING_TYPE_LABELS } from "./types";

/**
 * Badge colorido para exibir classificação contábil em listagens.
 * Cores variam por tipo (verde=receita, amarelo=custo, vermelho=despesa, azul=investimento, cinza=passivo).
 *
 * Uso:
 * <AccountingTypeBadge type={payable.accounting_type} />
 */

interface AccountingTypeBadgeProps {
  type: string | null | undefined;
  className?: string;
}

export function AccountingTypeBadge({ type, className }: AccountingTypeBadgeProps) {
  if (!type) {
    return (
      <Badge variant="outline" className={cn("text-xs text-muted-foreground", className)}>
        Não Classificado
      </Badge>
    );
  }

  const colorClass = ACCOUNTING_TYPE_COLORS[type] || "bg-gray-500/15 text-gray-700 border-gray-500/30";
  const label = ACCOUNTING_TYPE_LABELS[type] || type;

  return (
    <Badge variant="outline" className={cn("text-xs border", colorClass, className)}>
      {label}
    </Badge>
  );
}
