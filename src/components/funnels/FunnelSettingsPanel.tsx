import { Node } from "reactflow";
import { getBlockType } from "./funnelBlockTypes";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface Props {
  node: Node;
  onUpdate: (nodeId: string, data: Record<string, any>) => void;
  onClose: () => void;
}

export function FunnelSettingsPanel({ node, onUpdate, onClose }: Props) {
  const blockDef = getBlockType(node.data.tipo);
  if (!blockDef) return null;

  const config = node.data.config || {};
  const Icon = blockDef.icon;

  const updateConfig = (key: string, value: string | number) => {
    onUpdate(node.id, {
      ...node.data,
      config: { ...config, [key]: value },
    });
  };

  const updateLabel = (label: string) => {
    onUpdate(node.id, { ...node.data, label });
  };

  return (
    <div className="w-72 border-l bg-card overflow-y-auto flex-shrink-0">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" style={{ color: blockDef.color }} />
          <span className="font-semibold text-sm text-foreground">{blockDef.label}</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-3 space-y-4">
        <div>
          <Label className="text-xs">Nome do bloco</Label>
          <Input
            value={node.data.label || ""}
            onChange={(e) => updateLabel(e.target.value)}
            placeholder={blockDef.label}
            className="mt-1 h-8 text-sm"
          />
        </div>

        {blockDef.configFields?.map((field) => (
          <div key={field.key}>
            <Label className="text-xs">{field.label}</Label>
            {field.type === "textarea" ? (
              <Textarea
                value={config[field.key] || ""}
                onChange={(e) => updateConfig(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="mt-1 text-sm min-h-[80px]"
              />
            ) : field.type === "select" ? (
              <Select
                value={config[field.key] || ""}
                onValueChange={(v) => updateConfig(field.key, v)}
              >
                <SelectTrigger className="mt-1 h-8 text-sm">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {field.options?.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : field.type === "number" ? (
              <Input
                type="number"
                value={config[field.key] ?? field.defaultValue ?? ""}
                onChange={(e) => updateConfig(field.key, Number(e.target.value))}
                placeholder={field.placeholder}
                className="mt-1 h-8 text-sm"
              />
            ) : (
              <Input
                value={config[field.key] || ""}
                onChange={(e) => updateConfig(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="mt-1 h-8 text-sm"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
