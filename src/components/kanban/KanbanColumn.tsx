import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { KanbanCard, type Deal } from "./KanbanCard";

interface Stage {
  id: string;
  name: string;
  order: number;
  probability: number;
  cor_hex: string;
}

interface KanbanColumnProps {
  stage: Stage;
  deals: Deal[];
  onDragStart: (e: React.DragEvent, dealId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, stageId: string) => void;
  onCardClick: (deal: Deal) => void;
  onAddClick: (stageId: string) => void;
}

export function KanbanColumn({ stage, deals, onDragStart, onDragOver, onDrop, onCardClick, onAddClick }: KanbanColumnProps) {
  const total = deals.reduce((s, d) => s + Number(d.estimated_value), 0);

  return (
    <div
      className="flex-shrink-0 w-72"
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, stage.id)}
    >
      <div className="bg-muted/30 rounded-lg p-3 h-full">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.cor_hex }} />
            <div>
              <h3 className="font-semibold text-sm">{stage.name}</h3>
              <p className="text-xs text-muted-foreground">
                {deals.length} {deals.length === 1 ? "deal" : "deals"} · R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">{stage.probability}%</Badge>
        </div>

        <div className="space-y-2">
          {deals.map((deal) => (
            <KanbanCard
              key={deal.id}
              deal={deal}
              onDragStart={onDragStart}
              onClick={onCardClick}
            />
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() => onAddClick(stage.id)}
          >
            <Plus className="mr-1 h-3 w-3" />Adicionar
          </Button>
        </div>
      </div>
    </div>
  );
}

export type { Stage };
