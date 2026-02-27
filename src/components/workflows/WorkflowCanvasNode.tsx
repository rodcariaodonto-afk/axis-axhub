import { memo, useCallback } from "react";
import { Handle, Position, NodeProps, useReactFlow } from "reactflow";
import { getCatalogItem } from "./workflowCatalog";
import { Trash2, Zap, Play, Filter } from "lucide-react";

const TYPE_STYLES: Record<string, { color: string; label: string }> = {
  trigger: { color: "hsl(45, 93%, 47%)", label: "Gatilho" },
  action: { color: "hsl(var(--primary))", label: "Ação" },
  condition: { color: "hsl(142, 71%, 45%)", label: "Condição" },
};

function WorkflowCanvasNode({ id, data, selected }: NodeProps) {
  const { setNodes, setEdges } = useReactFlow();

  const onDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setNodes((nds) => nds.filter((n) => n.id !== id));
      setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
    },
    [id, setNodes, setEdges]
  );

  const catalogItem = getCatalogItem(data.type, data.catalogId);
  const style = TYPE_STYLES[data.type] || TYPE_STYLES.action;
  const Icon = catalogItem?.icon || (data.type === "trigger" ? Zap : data.type === "condition" ? Filter : Play);
  const label = catalogItem?.label || data.catalogId;
  const isCondition = data.type === "condition";

  return (
    <div
      className={`relative rounded-lg border-2 bg-card shadow-md min-w-[180px] transition-all group ${
        selected ? "ring-2 ring-primary border-primary" : "border-border"
      }`}
    >
      <button
        onClick={onDelete}
        className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
        title="Remover nó"
      >
        <Trash2 className="h-3 w-3" />
      </button>

      {data.type !== "trigger" && (
        <Handle
          type="target"
          position={Position.Top}
          id="default"
          className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
        />
      )}

      <div
        className="flex items-center gap-2 px-3 py-2 rounded-t-lg text-white text-xs font-semibold"
        style={{ backgroundColor: style.color }}
      >
        <Icon className="h-3.5 w-3.5" />
        <span className="uppercase tracking-wide">{style.label}</span>
      </div>

      <div className="px-3 py-2.5">
        <p className="font-medium text-sm text-foreground">{label}</p>
        {data.config && Object.keys(data.config).length > 0 && (
          <p className="text-xs text-muted-foreground mt-1 truncate max-w-[180px]">
            {Object.values(data.config).filter(Boolean).join(", ").slice(0, 40)}
          </p>
        )}
      </div>

      {!isCondition && (
        <Handle
          type="source"
          position={Position.Bottom}
          id="default"
          className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
        />
      )}

      {isCondition && (
        <>
          <div className="flex justify-between px-3 pb-1 text-[10px] text-muted-foreground">
            <span>Sim</span>
            <span>Não</span>
          </div>
          <Handle
            type="source"
            position={Position.Bottom}
            id="true"
            className="!w-3 !h-3 !bg-green-500 !border-2 !border-background"
            style={{ left: "25%" }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="false"
            className="!w-3 !h-3 !bg-red-500 !border-2 !border-background"
            style={{ left: "75%" }}
          />
        </>
      )}
    </div>
  );
}

export default memo(WorkflowCanvasNode);
