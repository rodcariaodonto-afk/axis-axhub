import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getCatalogItem } from "./workflowCatalog";

interface Step {
  id: string;
  node_id: string;
  node_type: string;
  status: string;
  input_data: Record<string, unknown>;
  output_data: Record<string, unknown>;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
}

interface Execution {
  id: string;
  status: string;
  trigger_type: string | null;
  trigger_data: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  workflows?: { name: string; definition: Record<string, unknown> } | null;
}

interface Props {
  executionId: string;
  onBack: () => void;
}

const statusIcon = (s: string) => {
  if (s === "completed") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (s === "failed") return <XCircle className="h-4 w-4 text-destructive" />;
  if (s === "running") return <Loader2 className="h-4 w-4 animate-spin" />;
  return <Clock className="h-4 w-4 text-muted-foreground" />;
};

export function WorkflowExecutionDetail({ executionId, onBack }: Props) {
  const [execution, setExecution] = useState<Execution | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [{ data: exec }, { data: stepsData }] = await Promise.all([
        supabase.from("workflow_executions").select("*, workflows(name, definition)").eq("id", executionId).single(),
        supabase.from("workflow_execution_steps").select("*").eq("execution_id", executionId).order("started_at", { ascending: true }),
      ]);
      if (exec) setExecution(exec as unknown as Execution);
      if (stepsData) setSteps(stepsData as unknown as Step[]);
      setLoading(false);
    };
    fetch();
  }, [executionId]);

  if (loading) return <div className="space-y-3"><Skeleton className="h-32" /><Skeleton className="h-48" /></div>;
  if (!execution) return <p className="text-sm text-muted-foreground">Execução não encontrada</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
        <h2 className="text-lg font-semibold">Detalhes da execução</h2>
      </div>

      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">{(execution.workflows as { name: string } | null)?.name || "Workflow"}</h3>
            <Badge variant={execution.status === "completed" ? "default" : execution.status === "failed" ? "destructive" : "secondary"}>
              {execution.status}
            </Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
            <div><span className="font-medium">Trigger:</span> {execution.trigger_type || "manual"}</div>
            <div><span className="font-medium">Início:</span> {new Date(execution.started_at).toLocaleString("pt-BR")}</div>
            {execution.completed_at && <div><span className="font-medium">Fim:</span> {new Date(execution.completed_at).toLocaleString("pt-BR")}</div>}
            {execution.duration_ms != null && <div><span className="font-medium">Duração:</span> {execution.duration_ms}ms</div>}
          </div>
          {execution.error_message && <p className="text-xs text-destructive">{execution.error_message}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3 px-4"><CardTitle className="text-sm">Passos ({steps.length})</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          {steps.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhum passo registrado</p>
          ) : (
            steps.map((step, i) => {
              const catalogItem = getCatalogItem(step.node_type, (step.input_data as Record<string, string>)?.catalogId || step.node_id);
              return (
                <div key={step.id} className="flex items-start gap-3 p-3 rounded-lg border">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs font-medium text-muted-foreground">#{i + 1}</span>
                    {statusIcon(step.status)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{catalogItem?.label || step.node_id}</span>
                      <Badge variant="outline" className="text-xs">{step.node_type}</Badge>
                    </div>
                    {step.duration_ms != null && <span className="text-xs text-muted-foreground">{step.duration_ms}ms</span>}
                    {step.error_message && <p className="text-xs text-destructive mt-1">{step.error_message}</p>}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
