import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search } from "lucide-react";
import { REPORT_TEMPLATES, CATEGORY_LABELS, type ReportTemplate, type ReportCategory } from "./reportTemplates";

interface Props {
  onSelect: (template: ReportTemplate) => void;
}

export function ReportTemplateSelector({ onSelect }: Props) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ReportCategory | "all">("all");

  const filtered = REPORT_TEMPLATES.filter((t) => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === "all" || t.category === category;
    return matchSearch && matchCategory;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar template..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <Tabs value={category} onValueChange={(v) => setCategory(v as any)}>
        <TabsList>
          <TabsTrigger value="all">Todos</TabsTrigger>
          {(Object.entries(CATEGORY_LABELS) as [ReportCategory, string][]).map(([key, label]) => (
            <TabsTrigger key={key} value={key}>{label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((template) => (
          <Card
            key={template.id}
            className="cursor-pointer border-border hover:border-primary/50 hover:shadow-md transition-all"
            onClick={() => onSelect(template)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-sm">{template.name}</h3>
                <Badge variant="secondary" className="text-xs shrink-0 ml-2">
                  {CATEGORY_LABELS[template.category]}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{template.description}</p>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-8 text-muted-foreground">Nenhum template encontrado</div>
        )}
      </div>
    </div>
  );
}
