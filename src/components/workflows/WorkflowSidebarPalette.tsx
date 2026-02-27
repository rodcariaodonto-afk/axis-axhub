import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { triggersCatalog, actionsCatalog, conditionsCatalog, type CatalogItem } from "./workflowCatalog";

export function WorkflowSidebarPalette() {
  const onDragStart = (event: React.DragEvent, item: CatalogItem) => {
    event.dataTransfer.setData("application/workflow-catalog-item", JSON.stringify({
      id: item.id,
      category: item.category,
    }));
    event.dataTransfer.effectAllowed = "move";
  };

  const renderItems = (items: CatalogItem[]) => (
    <div className="space-y-1">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.id}
            draggable
            onDragStart={(e) => onDragStart(e, item)}
            className="flex items-center gap-2 px-2.5 py-2 rounded-md border border-border bg-background cursor-grab hover:border-primary hover:bg-accent transition-colors text-sm"
            title={item.description}
          >
            <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <span className="text-foreground truncate text-xs">{item.label}</span>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="w-56 border-r bg-card overflow-hidden p-3 space-y-2 flex-shrink-0 flex flex-col">
      <h3 className="text-sm font-semibold text-foreground">Adicionar nó</h3>
      <Tabs defaultValue="triggers" className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full grid grid-cols-3 h-8 shrink-0">
          <TabsTrigger value="triggers" className="text-[10px]">Gatilhos</TabsTrigger>
          <TabsTrigger value="actions" className="text-[10px]">Ações</TabsTrigger>
          <TabsTrigger value="conditions" className="text-[10px]">Condições</TabsTrigger>
        </TabsList>
        <ScrollArea className="flex-1 mt-2">
          <TabsContent value="triggers" className="mt-0">{renderItems(triggersCatalog)}</TabsContent>
          <TabsContent value="actions" className="mt-0">{renderItems(actionsCatalog)}</TabsContent>
          <TabsContent value="conditions" className="mt-0">{renderItems(conditionsCatalog)}</TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
