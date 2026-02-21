import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Trash2, ChevronDown, ChevronUp, ArrowDown, Zap, Filter, Play } from "lucide-react";
import { getCatalogItem, type ConfigField } from "./workflowCatalog";

export interface WorkflowNode {
  id: string;
  type: "trigger" | "action" | "condition";
  catalogId: string;
  config: Record<string, string | number>;
  position: number;
}

interface Props {
  node: WorkflowNode;
  index: number;
  isLast: boolean;
  onUpdate: (node: WorkflowNode) => void;
  onRemove: (id: string) => void;
}

const typeColors = {
  trigger: "border-l-4 border-l-amber-500",
  action: "border-l-4 border-l-primary",
  condition: "border-l-4 border-l-emerald-500",
};

const typeIcons = { trigger: Zap, action: Play, condition: Filter };

export function WorkflowNodeCard({ node, index, isLast, onUpdate, onRemove }: Props) {
  const [expanded, setExpanded] = useState(false);
  const catalogItem = getCatalogItem(node.type, node.catalogId);
  const Icon = catalogItem?.icon || typeIcons[node.type];

  const handleConfigChange = (key: string, value: string | number) => {
    onUpdate({ ...node, config: { ...node.config, [key]: value } });
  };

  const configSummary = Object.entries(node.config)
    .filter(([, v]) => v !== "" && v !== undefined)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");

  return (
    <div className="flex flex-col items-center">
      <Card
        className={`w-full cursor-pointer transition-shadow hover:shadow-md ${typeColors[node.type]}`}
        onClick={() => setExpanded(!expanded)}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium uppercase text-muted-foreground">
                    {node.type === "trigger" ? "Gatilho" : node.type === "action" ? "Ação" : "Condição"}
                  </span>
                  <span className="text-xs text-muted-foreground">#{index + 1}</span>
                </div>
                <p className="font-medium text-sm">{catalogItem?.label || node.catalogId}</p>
                {configSummary && !expanded && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[300px]">{configSummary}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onRemove(node.id); }}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
              {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </div>

          {expanded && catalogItem?.configFields && (
            <div className="mt-4 space-y-3 border-t pt-3" onClick={(e) => e.stopPropagation()}>
              {catalogItem.configFields.map((field: ConfigField) => (
                <div key={field.key} className="space-y-1">
                  <Label className="text-xs">{field.label}{field.required && " *"}</Label>
                  {field.type === "select" ? (
                    <Select value={String(node.config[field.key] || "")} onValueChange={(v) => handleConfigChange(field.key, v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {field.options?.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : field.type === "textarea" ? (
                    <Textarea
                      className="text-xs min-h-[60px]"
                      placeholder={field.placeholder}
                      value={String(node.config[field.key] || "")}
                      onChange={(e) => handleConfigChange(field.key, e.target.value)}
                    />
                  ) : (
                    <Input
                      className="h-8 text-xs"
                      type={field.type === "number" ? "number" : "text"}
                      placeholder={field.placeholder}
                      value={String(node.config[field.key] || "")}
                      onChange={(e) => handleConfigChange(field.key, field.type === "number" ? Number(e.target.value) : e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {!isLast && (
        <div className="flex flex-col items-center py-1">
          <ArrowDown className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
