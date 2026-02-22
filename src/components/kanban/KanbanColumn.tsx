import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(stage.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleSaveName = async () => {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === stage.name) {
      setEditName(stage.name);
      setEditing(false);
      return;
    }
    const { error } = await supabase.from("pipeline_stages").update({ name: trimmed }).eq("id", stage.id);
    if (error) {
      toast({ title: "Erro ao renomear", description: error.message, variant: "destructive" });
      setEditName(stage.name);
    } else {
      stage.name = trimmed;
    }
    setEditing(false);
  };

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
              {editing ? (
                <Input
                  ref={inputRef}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={handleSaveName}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") { setEditName(stage.name); setEditing(false); }
                  }}
                  className="h-6 text-sm font-semibold px-1 py-0"
                />
              ) : (
                <h3
                  className="font-semibold text-sm cursor-pointer hover:text-primary transition-colors"
                  onDoubleClick={() => { setEditName(stage.name); setEditing(true); }}
                  title="Duplo-clique para editar"
                >
                  {stage.name}
                </h3>
              )}
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
