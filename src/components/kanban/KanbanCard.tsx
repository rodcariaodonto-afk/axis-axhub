import { Badge } from "@/components/ui/badge";
import { GripVertical } from "lucide-react";

interface Deal {
  id: string;
  name: string;
  estimated_value: number;
  stage_id: string;
  status: string;
  expected_close_date: string | null;
  descricao: string | null;
  prioridade: string;
  tags: string[];
  probabilidade_percentual: number;
  payment_status?: string | null;
  leads?: { name: string } | null;
  contacts?: { first_name: string; last_name: string | null } | null;
}

interface KanbanCardProps {
  deal: Deal;
  onDragStart: (e: React.DragEvent, dealId: string) => void;
  onClick: (deal: Deal) => void;
}

const prioridadeConfig: Record<string, { label: string; class: string }> = {
  urgente: { label: "Urgente", class: "bg-destructive/20 text-destructive border-destructive/30" },
  alta: { label: "Alta", class: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  normal: { label: "Normal", class: "bg-primary/20 text-primary border-primary/30" },
  baixa: { label: "Baixa", class: "bg-muted text-muted-foreground border-border" },
};

export function KanbanCard({ deal, onDragStart, onClick }: KanbanCardProps) {
  const prio = prioridadeConfig[deal.prioridade] || prioridadeConfig.normal;

  return (
    <div
      className="border border-border bg-card rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-primary/40 transition-colors shadow-sm"
      draggable
      onDragStart={(e) => onDragStart(e, deal.id)}
      onClick={() => onClick(deal)}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0 opacity-40" />
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <p className="font-medium text-sm truncate flex-1">{deal.name}</p>
            {deal.prioridade !== "normal" && (
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${prio.class}`}>
                {prio.label}
              </Badge>
            )}
          </div>

          {deal.leads?.name && (
            <p className="text-xs text-muted-foreground truncate">{deal.leads.name}</p>
          )}
          {deal.contacts && (
            <p className="text-xs text-muted-foreground truncate">
              {deal.contacts.first_name} {deal.contacts.last_name || ""}
            </p>
          )}

          {deal.descricao && (
            <p className="text-xs text-muted-foreground line-clamp-2">{deal.descricao}</p>
          )}

          {deal.tags && deal.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {deal.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                  {tag}
                </Badge>
              ))}
              {deal.tags.length > 3 && (
                <span className="text-[10px] text-muted-foreground">+{deal.tags.length - 3}</span>
              )}
            </div>
          )}

          {deal.payment_status && deal.payment_status !== "Pendente" && (
            <Badge
              variant={deal.payment_status === "Pago" ? "default" : "outline"}
              className={`text-[10px] px-1.5 py-0 ${deal.payment_status === "Pago" ? "bg-green-600/20 text-green-400 border-green-600/30" : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"}`}
            >
              {deal.payment_status}
            </Badge>
          )}

          <div className="flex items-center justify-between mt-1">
            <span className="text-sm font-semibold text-primary">
              R$ {Number(deal.estimated_value).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
            </span>
            {deal.expected_close_date && (
              <span className="text-[10px] text-muted-foreground">
                {new Date(deal.expected_close_date).toLocaleDateString("pt-BR")}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export type { Deal };
