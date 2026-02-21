import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Zap, Play, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { WorkflowTemplateSelector } from "./WorkflowTemplateSelector";
import type { WorkflowTemplate } from "./workflowTemplates";

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  is_published: boolean;
  version: number;
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  created_at: string;
  updated_at: string;
}

interface Props {
  onEdit: (id: string) => void;
  onCreate: () => void;
}

export function WorkflowList({ onEdit, onCreate }: Props) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [templateOpen, setTemplateOpen] = useState(false);

  const fetchWorkflows = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("workflows").select("*").order("updated_at", { ascending: false });
    if (!error && data) setWorkflows(data as unknown as Workflow[]);
    setLoading(false);
  };

  useEffect(() => { fetchWorkflows(); }, []);

  const toggleActive = async (wf: Workflow) => {
    const { error } = await supabase.from("workflows").update({ is_active: !wf.is_active }).eq("id", wf.id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setWorkflows(workflows.map((w) => (w.id === wf.id ? { ...w, is_active: !w.is_active } : w)));
  };

  const deleteWorkflow = async (id: string) => {
    const { error } = await supabase.from("workflows").delete().eq("id", id);
    if (error) { toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" }); return; }
    setWorkflows(workflows.filter((w) => w.id !== id));
    toast({ title: "Workflow excluído" });
  };

  const handleTemplateSelect = async (template: WorkflowTemplate) => {
    setTemplateOpen(false);
    const tenantId = (await supabase.rpc("get_user_tenant_id") as any).data;
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const { data, error } = await supabase.from("workflows").insert({
      tenant_id: tenantId,
      name: template.name,
      description: template.description,
      definition: template.definition as any,
      is_active: false,
      is_published: false,
      created_by: userId,
    }).select("id").single();
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Workflow criado a partir do template!" });
    if (data) onEdit(data.id);
  };

  const runManual = async (wf: Workflow) => {
    const { error } = await supabase.functions.invoke("workflow-runner", {
      body: { workflow_id: wf.id, trigger_data: {}, trigger_type: "manual" },
    });
    if (error) { toast({ title: "Erro ao executar", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Workflow executado!" });
    fetchWorkflows();
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex justify-end"><Button onClick={onCreate}><Plus className="h-4 w-4 mr-1" />Novo Workflow</Button></div>
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setTemplateOpen(true)}><FileText className="h-4 w-4 mr-1" />Usar Template</Button>
        <Button onClick={onCreate}><Plus className="h-4 w-4 mr-1" />Novo Workflow</Button>
      </div>

      {workflows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Zap className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum workflow criado ainda</p>
            <p className="text-xs mt-1">Crie seu primeiro workflow para automatizar processos</p>
          </CardContent>
        </Card>
      ) : (
        workflows.map((wf) => (
          <Card key={wf.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm truncate">{wf.name}</h3>
                      {wf.is_published ? <Badge variant="default" className="text-xs">Publicado</Badge> : <Badge variant="secondary" className="text-xs">Rascunho</Badge>}
                    </div>
                    {wf.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{wf.description}</p>}
                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{wf.total_executions} execuções</span>
                      <span className="text-emerald-600">{wf.successful_executions} ✓</span>
                      {wf.failed_executions > 0 && <span className="text-destructive">{wf.failed_executions} ✗</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={wf.is_active} onCheckedChange={() => toggleActive(wf)} />
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => runManual(wf)} title="Executar manualmente">
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(wf.id)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteWorkflow(wf.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      <WorkflowTemplateSelector open={templateOpen} onClose={() => setTemplateOpen(false)} onSelect={handleTemplateSelect} />
    </div>
  );
}
