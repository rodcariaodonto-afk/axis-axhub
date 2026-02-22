import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { getBlockType } from "./funnelBlockTypes";

function FunnelCustomNode({ data, selected }: NodeProps) {
  const blockDef = getBlockType(data.tipo);
  if (!blockDef) return null;

  const Icon = blockDef.icon;
  const hasTargets = blockDef.handles.targets.length > 0;
  const sources = blockDef.handles.sources;

  return (
    <div
      className={`rounded-lg border-2 bg-card shadow-md min-w-[180px] transition-all ${
        selected ? "ring-2 ring-primary border-primary" : "border-border"
      }`}
    >
      {hasTargets && (
        <Handle
          type="target"
          position={Position.Top}
          id="default"
          className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
        />
      )}

      <div
        className="flex items-center gap-2 px-3 py-2 rounded-t-lg text-white text-xs font-semibold"
        style={{ backgroundColor: blockDef.color }}
      >
        <Icon className="h-3.5 w-3.5" />
        <span className="uppercase tracking-wide">{blockDef.category}</span>
      </div>

      <div className="px-3 py-2.5">
        <p className="font-medium text-sm text-foreground">{data.label || blockDef.label}</p>
        {data.config?.mensagem && (
          <p className="text-xs text-muted-foreground mt-1 truncate max-w-[180px]">
            {data.config.mensagem}
          </p>
        )}
        {data.tipo === "delay" && data.config?.segundos && (
          <p className="text-xs text-muted-foreground mt-1">{data.config.segundos}s</p>
        )}
      </div>

      {sources.length === 1 && (
        <Handle
          type="source"
          position={Position.Bottom}
          id={sources[0]}
          className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
        />
      )}

      {sources.length === 2 && (
        <>
          <div className="flex justify-between px-3 pb-1 text-[10px] text-muted-foreground">
            <span>Sim</span>
            <span>Não</span>
          </div>
          <Handle
            type="source"
            position={Position.Bottom}
            id="sim"
            className="!w-3 !h-3 !bg-green-500 !border-2 !border-background"
            style={{ left: "25%" }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="nao"
            className="!w-3 !h-3 !bg-red-500 !border-2 !border-background"
            style={{ left: "75%" }}
          />
        </>
      )}
    </div>
  );
}

export default memo(FunnelCustomNode);
