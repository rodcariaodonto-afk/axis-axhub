import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { WORKFLOW_TEMPLATES, TEMPLATE_CATEGORY_LABELS, type WorkflowTemplate } from "./workflowTemplates";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (template: WorkflowTemplate) => void;
}

export function WorkflowTemplateSelector({ open, onClose, onSelect }: Props) {
  const [cat, setCat] = useState("all");
  const filtered = cat === "all" ? WORKFLOW_TEMPLATES : WORKFLOW_TEMPLATES.filter((t) => t.category === cat);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar a partir de template</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 flex-wrap mb-4">
          {Object.entries(TEMPLATE_CATEGORY_LABELS).map(([key, label]) => (
            <Button key={key} variant={cat === key ? "default" : "outline"} size="sm" onClick={() => setCat(key)}>
              {label}
            </Button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((tpl) => (
            <Card key={tpl.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => onSelect(tpl)}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{tpl.icon}</span>
                  <h3 className="font-medium text-sm">{tpl.name}</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{tpl.description}</p>
                <Badge variant="secondary" className="text-xs">
                  {TEMPLATE_CATEGORY_LABELS[tpl.category]} · {tpl.definition.nodes.length} passos
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
