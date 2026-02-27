import { useState, useEffect, useCallback, useRef } from "react";
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Connection,
  Node,
  ReactFlowInstance,
  BackgroundVariant,
} from "reactflow";
import "reactflow/dist/style.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { getCatalogItem } from "./workflowCatalog";
import WorkflowCanvasNode from "./WorkflowCanvasNode";
import { WorkflowSidebarPalette } from "./WorkflowSidebarPalette";
import { WorkflowSettingsPanel } from "./WorkflowSettingsPanel";

const nodeTypes = { workflowNode: WorkflowCanvasNode };

interface Props {
  workflowId?: string;
  onBack: () => void;
}

export function WorkflowBuilder({ workflowId, onBack }: Props) {
  const { user } = useAuth();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("profiles").select("tenant_id").eq("id", user?.id || "").single()
      .then(({ data }) => { if (data) setTenantId(data.tenant_id); });
  }, [user]);

  // Load existing workflow
  useEffect(() => {
    if (!workflowId) return;
    supabase.from("workflows").select("*").eq("id", workflowId).single()
      .then(({ data }) => {
        if (!data) return;
        setName(data.name);
        const def = data.definition as any;
        if (def?.nodes) {
          const loadedNodes: Node[] = def.nodes.map((n: any, i: number) => ({
            id: n.id,
            type: "workflowNode",
            position: n.position?.x != null ? { x: n.position.x, y: n.position.y } : { x: 250, y: i * 150 },
            data: { type: n.type, catalogId: n.catalogId, config: n.config || {} },
          }));
          setNodes(loadedNodes);
        }
        if (def?.edges) {
          setEdges(def.edges.map((e: any) => ({
            id: e.id || `${e.source}-${e.target}`,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle || e.condition || undefined,
            animated: true,
            style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
          })));
        }
      });
  }, [workflowId, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge({ ...params, animated: true, style: { stroke: "hsl(var(--primary))", strokeWidth: 2 } }, eds)
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
      const raw = event.dataTransfer.getData("application/workflow-catalog-item");
      if (!raw || !rfInstance || !reactFlowWrapper.current) return;

      const { id, category } = JSON.parse(raw);
      const catalogItem = getCatalogItem(category, id);
      if (!catalogItem) return;

      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = rfInstance.project({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      const newNode: Node = {
        id: `${category}_${Date.now()}`,
        type: "workflowNode",
        position,
        data: { type: category, catalogId: id, config: {} },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [rfInstance, setNodes]
  );

  const nodeClickedRef = useRef(false);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    nodeClickedRef.current = true;
    setSelectedNode(node);
    setTimeout(() => { nodeClickedRef.current = false; }, 100);
  }, []);

  const onPaneClick = useCallback(() => {
    if (!nodeClickedRef.current) setSelectedNode(null);
  }, []);

  const updateNodeData = useCallback(
    (nodeId: string, data: Record<string, any>) => {
      setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, data } : n)));
      setSelectedNode((prev) => (prev?.id === nodeId ? { ...prev, data } : prev));
    },
    [setNodes]
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      setSelectedNode(null);
    },
    [setNodes, setEdges]
  );

  const handleSave = async (publish = false) => {
    if (!name.trim()) { toast({ title: "Nome obrigatório", variant: "destructive" }); return; }
    if (nodes.length === 0) { toast({ title: "Adicione pelo menos um nó", variant: "destructive" }); return; }
    if (!tenantId || !user) return;

    publish ? setPublishing(true) : setSaving(true);

    const defNodes = nodes.map((n) => ({
      id: n.id,
      type: n.data.type,
      catalogId: n.data.catalogId,
      config: n.data.config || {},
      position: { x: n.position.x, y: n.position.y },
    }));
    const defEdges = edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle || undefined,
    }));
    const definition = { nodes: defNodes, edges: defEdges };

    const triggerTypes = defNodes
      .filter((n) => n.type === "trigger")
      .map((n) => n.catalogId);

    let error;
    if (workflowId) {
      ({ error } = await supabase.from("workflows").update({
        name: name.trim(),
        definition: JSON.parse(JSON.stringify(definition)),
        trigger_types: triggerTypes,
        ...(publish ? { is_published: true, published_at: new Date().toISOString(), is_active: true } : {}),
      }).eq("id", workflowId));
    } else {
      ({ error } = await supabase.from("workflows").insert({
        name: name.trim(),
        definition: JSON.parse(JSON.stringify(definition)),
        trigger_types: triggerTypes,
        tenant_id: tenantId,
        created_by: user.id,
        ...(publish ? { is_published: true, published_at: new Date().toISOString(), is_active: true } : {}),
      }));
    }

    setSaving(false);
    setPublishing(false);
    if (error) { toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" }); return; }
    toast({ title: publish ? "Workflow publicado!" : "Workflow salvo!" });
    if (!workflowId) onBack();
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      <WorkflowSidebarPalette />

      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-card">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Input
              className="h-8 w-64 text-sm font-semibold"
              placeholder="Nome do workflow..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={saving}>
              <Save className="h-4 w-4 mr-1" />{saving ? "Salvando..." : "Salvar rascunho"}
            </Button>
            <Button size="sm" onClick={() => handleSave(true)} disabled={publishing}>
              <Rocket className="h-4 w-4 mr-1" />{publishing ? "Publicando..." : "Publicar"}
            </Button>
          </div>
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
            fitView
            deleteKeyCode={["Backspace", "Delete"]}
            className="bg-background"
          >
            <Controls className="!bg-card !border-border !shadow-md" />
            <MiniMap className="!bg-card !border-border" />
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="hsl(var(--muted-foreground) / 0.2)" />
          </ReactFlow>
        </div>
      </div>

      {selectedNode && (
        <WorkflowSettingsPanel
          node={selectedNode}
          onUpdate={updateNodeData}
          onClose={() => setSelectedNode(null)}
          onDelete={deleteNode}
        />
      )}
    </div>
  );
}
