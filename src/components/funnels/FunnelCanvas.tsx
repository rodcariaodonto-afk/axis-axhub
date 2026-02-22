import { useCallback, useRef, useState } from "react";
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  ReactFlowInstance,
  BackgroundVariant,
} from "reactflow";
import "reactflow/dist/style.css";
import FunnelCustomNode from "./FunnelCustomNode";
import FunnelCustomEdge from "./FunnelCustomEdge";
import { FunnelSidebarPalette } from "./FunnelSidebarPalette";
import { FunnelSettingsPanel } from "./FunnelSettingsPanel";
import { getBlockType } from "./funnelBlockTypes";
import { Button } from "@/components/ui/button";
import { Save, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const nodeTypes = { funnelBlock: FunnelCustomNode };
const edgeTypes = { funnelEdge: FunnelCustomEdge };

interface Props {
  funilId: string;
  funilNome: string;
  initialNodes: Node[];
  initialEdges: Edge[];
  tenantId: string;
}

export function FunnelCanvas({ funilId, funilNome, initialNodes, initialEdges, tenantId }: Props) {
  const navigate = useNavigate();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [saving, setSaving] = useState(false);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "funnelEdge",
            animated: true,
            style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const tipo = event.dataTransfer.getData("application/funnel-block-type");
      if (!tipo || !rfInstance || !reactFlowWrapper.current) return;

      const blockDef = getBlockType(tipo);
      if (!blockDef) return;

      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = rfInstance.project({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      const newNode: Node = {
        id: crypto.randomUUID(),
        type: "funnelBlock",
        position,
        data: { tipo, label: blockDef.label, config: {} },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [rfInstance, setNodes]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const updateNodeData = useCallback(
    (nodeId: string, data: Record<string, any>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data } : n))
      );
      setSelectedNode((prev) => (prev?.id === nodeId ? { ...prev, data } : prev));
    },
    [setNodes]
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      // Delete existing blocks and connections
      await supabase.from("funis_conexoes").delete().eq("funil_id", funilId);
      await supabase.from("funis_blocos").delete().eq("funil_id", funilId);

      // Insert blocks
      const blocosToInsert = nodes.map((n) => ({
        id: n.id,
        funil_id: funilId,
        tenant_id: tenantId,
        tipo: n.data.tipo,
        label: n.data.label || "",
        posicao_x: n.position.x,
        posicao_y: n.position.y,
        config: n.data.config || {},
      }));

      if (blocosToInsert.length > 0) {
        const { error: blocosError } = await supabase.from("funis_blocos").insert(blocosToInsert);
        if (blocosError) throw blocosError;
      }

      // Insert connections
      const conexoesToInsert = edges.map((e) => ({
        funil_id: funilId,
        tenant_id: tenantId,
        source_bloco_id: e.source,
        target_bloco_id: e.target,
        source_handle: e.sourceHandle || null,
        target_handle: e.targetHandle || null,
        label: (e as any).label || null,
      }));

      if (conexoesToInsert.length > 0) {
        const { error: conexoesError } = await supabase.from("funis_conexoes").insert(conexoesToInsert);
        if (conexoesError) throw conexoesError;
      }

      toast.success("Funil salvo com sucesso!");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      <FunnelSidebarPalette />

      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-card">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/funis")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="font-semibold text-foreground">{funilNome}</h2>
          </div>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1.5" />
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>

        {/* Canvas */}
        <div ref={reactFlowWrapper} className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setRfInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={{ type: "funnelEdge" }}
            fitView
            deleteKeyCode={["Backspace", "Delete"]}
            className="bg-background"
          >
            <Controls className="!bg-card !border-border !shadow-md" />
            <MiniMap
              className="!bg-card !border-border"
              nodeColor={(n) => {
                const def = getBlockType(n.data?.tipo);
                return def?.color || "hsl(var(--muted))";
              }}
            />
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="hsl(var(--muted-foreground) / 0.2)" />
          </ReactFlow>
        </div>
      </div>

      {selectedNode && (
        <FunnelSettingsPanel
          node={selectedNode}
          onUpdate={updateNodeData}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}
