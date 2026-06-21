import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, XCircle, Circle } from "lucide-react";

export type SefazStatus =
  | "validado_sefaz"
  | "invalido_sefaz"
  | "sefaz_indisponivel"
  | "nao_configurado"
  | "nao_verificado"
  | null
  | undefined;

interface Props {
  status: SefazStatus;
  compact?: boolean;
}

const CONFIG: Record<string, { label: string; className: string; Icon: React.ElementType }> = {
  validado_sefaz: {
    label: "SEFAZ válida",
    className: "bg-green-500/15 text-green-600 border-green-500/30",
    Icon: CheckCircle,
  },
  invalido_sefaz: {
    label: "SEFAZ inválida",
    className: "bg-red-500/15 text-red-600 border-red-500/30",
    Icon: XCircle,
  },
  sefaz_indisponivel: {
    label: "SEFAZ indispon.",
    className: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
    Icon: AlertTriangle,
  },
};

const DEFAULT_CONFIG = {
  label: "Não verificado",
  className: "bg-muted text-muted-foreground border-border",
  Icon: Circle,
};

export function SefazValidationBadge({ status, compact = false }: Props) {
  const cfg = (status && CONFIG[status]) || DEFAULT_CONFIG;
  const { label, className, Icon } = cfg;

  return (
    <Badge variant="outline" className={`text-xs gap-1 ${className}`} title={label}>
      <Icon className="h-3 w-3 shrink-0" />
      {!compact && <span>{label}</span>}
    </Badge>
  );
}
