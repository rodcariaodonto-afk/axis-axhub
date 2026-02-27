import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkflowList } from "@/components/workflows/WorkflowList";
import { WorkflowBuilder } from "@/components/workflows/WorkflowBuilder";
import { WorkflowExecutionList } from "@/components/workflows/WorkflowExecutionList";
import { WorkflowExecutionDetail } from "@/components/workflows/WorkflowExecutionDetail";

type View = { type: "list" } | { type: "builder"; workflowId?: string } | { type: "execution-detail"; executionId: string };

export default function Workflows() {
  const [view, setView] = useState<View>({ type: "list" });
  const [activeTab, setActiveTab] = useState("workflows");

  if (view.type === "builder") {
    return <WorkflowBuilder workflowId={view.workflowId} onBack={() => setView({ type: "list" })} />;
  }

  if (view.type === "execution-detail") {
    return (
      <div className="p-6">
        <WorkflowExecutionDetail executionId={view.executionId} onBack={() => setView({ type: "list" })} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Workflows</h1>
        <p className="text-sm text-muted-foreground">Automatize processos com gatilhos, condições e ações</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="workflows">Meus Workflows</TabsTrigger>
          <TabsTrigger value="executions">Execuções</TabsTrigger>
        </TabsList>
        <TabsContent value="workflows" className="mt-4">
          <WorkflowList
            onEdit={(id) => setView({ type: "builder", workflowId: id })}
            onCreate={() => setView({ type: "builder" })}
          />
        </TabsContent>
        <TabsContent value="executions" className="mt-4">
          <WorkflowExecutionList onViewDetail={(id) => setView({ type: "execution-detail", executionId: id })} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
