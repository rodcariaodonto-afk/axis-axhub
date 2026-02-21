import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Rocket, Plus, Zap, Play, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { WorkflowNodeCard, type WorkflowNode } from "./WorkflowNodeCard";
import { triggersCatalog, actionsCatalog, conditionsCatalog, type CatalogItem } from "./workflowCatalog";

interface Props {
  workflowId?: string;
  onBack: () => void;
}

export function WorkflowBuilder({ workflowId, onBack }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("profiles").select("tenant_id").eq("id", user?.id || "").single()
      .then(({ data }) => { if (data) setTenantId(data.tenant_id); });
  }, [user]);

  useEffect(() => {
    if (!workflowId) return;
    supabase.from("workflows").select("*").eq("id", workflowId).single()
      .then(({ data }) => {
        if (data) {
          setName(data.name);
          setDescription(data.description || "");
          const def = data.definition as { nodes?: Array<{ id: string; type: string; catalogId?: string; config?: Record<string, string | number>; position?: number }> } | null;
          if (def?.nodes) {
            setNodes(def.nodes.map((n, i) => ({
              id: n.id,
              type: n.type as WorkflowNode["type"],
              catalogId: n.catalogId || (n.config as Record<string, string>)?.event || n.id,
              config: n.config || {},
              position: n.position ?? i,
            })));
          }
        }
      });
  }, [workflowId]);

  const addNode = (item: CatalogItem) => {
    const newNode: WorkflowNode = {
      id: `${item.category}_${Date.now()}`,
      type: item.category,
      catalogId: item.id,
      config: {},
      position: nodes.length,
    };
    setNodes([...nodes, newNode]);
  };

  const updateNode = (updated: WorkflowNode) => {
    setNodes(nodes.map((n) => (n.id === updated.id ? updated : n)));
  };

  const removeNode = (id: string) => {
    setNodes(nodes.filter((n) => n.id !== id).map((n, i) => ({ ...n, position: i })));
  };

  const buildDefinition = () => {
    const defNodes = nodes.map((n, i) => ({
      id: n.id, type: n.type, catalogId: n.catalogId, config: n.config, position: i,
    }));
    const edges = defNodes.slice(0, -1).map((n, i) => ({
      source: n.id, target: defNodes[i + 1].id,
      ...(n.type === "condition" ? { condition: "true" } : {}),
    }));
    return { nodes: defNodes, edges };
  };

  const handleSave = async (publish = false) => {
    if (!name.trim()) { toast({ title: "Nome obrigatório", variant: "destructive" }); return; }
    if (nodes.length === 0) { toast({ title: "Adicione pelo menos um nó", variant: "destructive" }); return; }
    if (!tenantId || !user) return;

    publish ? setPublishing(true) : setSaving(true);
    const definition = buildDefinition();

    let error;
    if (workflowId) {
      ({ error } = await supabase.from("workflows").update({
        name: name.trim(),
        description: description.trim() || null,
        definition: JSON.parse(JSON.stringify(definition)),
        ...(publish ? { is_published: true, published_at: new Date().toISOString(), is_active: true } : {}),
      }).eq("id", workflowId));
    } else {
      ({ error } = await supabase.from("workflows").insert({
        name: name.trim(),
        description: description.trim() || null,
        definition: JSON.parse(JSON.stringify(definition)),
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

  const catalogSection = (title: string, items: CatalogItem[], icon: typeof Zap) => (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
        {(() => { const I = icon; return <I className="h-3 w-3" />; })()}{title}
      </h4>
      {items.map((item) => (
        <Button key={item.id} variant="outline" size="sm" className="w-full justify-start text-xs h-auto py-2" onClick={() => addNode(item)}>
          <item.icon className="h-3.5 w-3.5 mr-2 shrink-0" />
          <span className="truncate">{item.label}</span>
          <Plus className="h-3 w-3 ml-auto shrink-0 text-muted-foreground" />
        </Button>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
          <h2 className="text-lg font-semibold">{workflowId ? "Editar Workflow" : "Novo Workflow"}</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={saving}>
            <Save className="h-4 w-4 mr-1" />{saving ? "Salvando..." : "Salvar rascunho"}
          </Button>
          <Button size="sm" onClick={() => handleSave(true)} disabled={publishing}>
            <Rocket className="h-4 w-4 mr-1" />{publishing ? "Publicando..." : "Publicar"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Sidebar - Catalog */}
        <Card className="lg:col-span-1">
          <CardHeader className="py-3 px-4"><CardTitle className="text-sm">Adicionar nó</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4">
            <ScrollArea className="h-[500px] pr-2">
              <Tabs defaultValue="triggers" className="w-full">
                <TabsList className="w-full grid grid-cols-3 h-8">
                  <TabsTrigger value="triggers" className="text-xs">Gatilhos</TabsTrigger>
                  <TabsTrigger value="actions" className="text-xs">Ações</TabsTrigger>
                  <TabsTrigger value="conditions" className="text-xs">Condições</TabsTrigger>
                </TabsList>
                <TabsContent value="triggers" className="mt-3">{catalogSection("Gatilhos", triggersCatalog, Zap)}</TabsContent>
                <TabsContent value="actions" className="mt-3">{catalogSection("Ações", actionsCatalog, Play)}</TabsContent>
                <TabsContent value="conditions" className="mt-3">{catalogSection("Condições", conditionsCatalog, Filter)}</TabsContent>
              </Tabs>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Main - Builder */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nome do workflow *</Label>
                  <Input placeholder="Ex: Notificar lead quente" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Descrição</Label>
                  <Textarea placeholder="Descrição opcional" className="min-h-[38px] resize-none" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Fluxo</CardTitle>
                <Badge variant="secondary" className="text-xs">{nodes.length} nó(s)</Badge>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {nodes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Zap className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Adicione nós usando o painel à esquerda</p>
                  <p className="text-xs mt-1">Comece com um gatilho, adicione condições e ações</p>
                </div>
              ) : (
                <div className="space-y-0 max-w-xl mx-auto">
                  {nodes.map((node, i) => (
                    <WorkflowNodeCard key={node.id} node={node} index={i} isLast={i === nodes.length - 1} onUpdate={updateNode} onRemove={removeNode} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
