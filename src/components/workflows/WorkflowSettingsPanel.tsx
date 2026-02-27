import { Node } from "reactflow";
import { getCatalogItem } from "./workflowCatalog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Trash2 } from "lucide-react";

interface Props {
  node: Node;
  onUpdate: (nodeId: string, data: Record<string, any>) => void;
  onClose: () => void;
  onDelete: (nodeId: string) => void;
}

export function WorkflowSettingsPanel({ node, onUpdate, onClose, onDelete }: Props) {
  const catalogItem = getCatalogItem(node.data.type, node.data.catalogId);
  const fields = catalogItem?.configFields || [];
  const config = node.data.config || {};

  const updateField = (key: string, value: string) => {
    onUpdate(node.id, {
      ...node.data,
      config: { ...config, [key]: value },
    });
  };

  return (
    <div className="w-72 border-l bg-card flex flex-col flex-shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="text-sm font-semibold text-foreground truncate">
          {catalogItem?.label || node.data.catalogId}
        </h3>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        {catalogItem && (
          <p className="text-xs text-muted-foreground mb-4">{catalogItem.description}</p>
        )}

        {fields.length === 0 ? (
          <p className="text-xs text-muted-foreground">Este nó não possui campos configuráveis.</p>
        ) : (
          <div className="space-y-3">
            {fields.map((field) => (
              <div key={field.key} className="space-y-1">
                <Label className="text-xs">
                  {field.label}{field.required && " *"}
                </Label>
                {field.type === "select" ? (
                  <Select value={config[field.key] || ""} onValueChange={(v) => updateField(field.key, v)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Selecionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : field.type === "textarea" ? (
                  <Textarea
                    className="text-xs min-h-[60px] resize-none"
                    placeholder={field.placeholder}
                    value={config[field.key] || ""}
                    onChange={(e) => updateField(field.key, e.target.value)}
                  />
                ) : (
                  <Input
                    className="h-8 text-xs"
                    type={field.type === "number" ? "number" : "text"}
                    placeholder={field.placeholder}
                    value={config[field.key] || ""}
                    onChange={(e) => updateField(field.key, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="p-4 border-t">
        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={() => onDelete(node.id)}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          Remover nó
        </Button>
      </div>
    </div>
  );
}
