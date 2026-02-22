import { memo, useCallback } from "react";
import {
  EdgeProps,
  getBezierPath,
  EdgeLabelRenderer,
  useReactFlow,
} from "reactflow";
import { Plus, Trash2 } from "lucide-react";
import { getBlockType } from "./funnelBlockTypes";

function FunnelCustomEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  sourceHandleId,
  targetHandleId,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const { setEdges, setNodes } = useReactFlow();

  const onDeleteEdge = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setEdges((eds) => eds.filter((edge) => edge.id !== id));
    },
    [id, setEdges]
  );

  const onAddNode = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const blockDef = getBlockType("delay");
      if (!blockDef) return;

      const newNodeId = crypto.randomUUID();
      const newNode = {
        id: newNodeId,
        type: "funnelBlock",
        position: { x: labelX - 90, y: labelY - 30 },
        data: { tipo: "delay", label: blockDef.label, config: {} },
      };

      setEdges((eds) => {
        const filteredEdges = eds.filter((edge) => edge.id !== id);
        return [
          ...filteredEdges,
          {
            id: `${source}-${newNodeId}`,
            source,
            target: newNodeId,
            sourceHandle: sourceHandleId,
            targetHandle: "default",
            type: "funnelEdge",
            animated: true,
            style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
          },
          {
            id: `${newNodeId}-${target}`,
            source: newNodeId,
            target,
            sourceHandle: "default",
            targetHandle: targetHandleId,
            type: "funnelEdge",
            animated: true,
            style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
          },
        ];
      });

      setNodes((nds) => [...nds, newNode]);
    },
    [id, source, target, sourceHandleId, targetHandleId, labelX, labelY, setEdges, setNodes]
  );

  return (
    <>
      <path
        id={id}
        style={style}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="flex items-center gap-1 nodrag nopan"
        >
          <button
            onClick={onAddNode}
            className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground shadow-md hover:scale-110 transition-transform"
            title="Adicionar bloco aqui"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDeleteEdge}
            className="flex items-center justify-center w-6 h-6 rounded-full bg-destructive text-destructive-foreground shadow-md hover:scale-110 transition-transform"
            title="Remover conexão"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(FunnelCustomEdge);
