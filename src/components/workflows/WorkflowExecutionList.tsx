import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Eye, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Execution {
  id: string;
  workflow_id: string;
  trigger_type: string | null;
  status: string;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  workflows?: { name: string } | null;
}

interface Props {
  onViewDetail: (id: string) => void;
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle2 }> = {
  completed: { label: "Concluído", variant: "default", icon: CheckCircle2 },
  failed: { label: "Falhou", variant: "destructive", icon: XCircle },
  running: { label: "Executando", variant: "secondary", icon: Loader2 },
  pending: { label: "Pendente", variant: "outline", icon: Clock },
};

export function WorkflowExecutionList({ onViewDetail }: Props) {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("workflow_executions")
        .select("*, workflows(name)")
        .order("started_at", { ascending: false })
        .limit(50);
      if (data) setExecutions(data as unknown as Execution[]);
      setLoading(false);
    };
    fetch();

    const channel = supabase
      .channel("wf-exec-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "workflow_executions" }, () => { fetch(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) return <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;

  if (executions.length === 0) {
    return (
      <Card><CardContent className="py-12 text-center text-muted-foreground">
        <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Nenhuma execução registrada</p>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-2">
      {executions.map((exec) => {
        const st = statusMap[exec.status] || statusMap.pending;
        const StIcon = st.icon;
        return (
          <Card key={exec.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <StIcon className={`h-5 w-5 shrink-0 ${exec.status === "running" ? "animate-spin" : ""}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{(exec.workflows as { name: string } | null)?.name || "Workflow"}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span>{exec.trigger_type || "manual"}</span>
                    <span>·</span>
                    <span>{formatDistanceToNow(new Date(exec.started_at), { addSuffix: true, locale: ptBR })}</span>
                    {exec.duration_ms != null && <><span>·</span><span>{exec.duration_ms}ms</span></>}
                  </div>
                  {exec.error_message && <p className="text-xs text-destructive mt-0.5 truncate max-w-[400px]">{exec.error_message}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={st.variant} className="text-xs">{st.label}</Badge>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onViewDetail(exec.id)}>
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
