import { useState } from "react";
import { CONNECTORS, CATEGORY_LABELS, ConnectorDefinition } from "./connectorsCatalog";
import IntegrationCard from "./IntegrationCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface IntegrationCatalogProps {
  connectedSlugs: string[];
  onConnect: (connector: ConnectorDefinition) => void;
  onManage: (connector: ConnectorDefinition) => void;
}

export default function IntegrationCatalog({ connectedSlugs, onConnect, onManage }: IntegrationCatalogProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const filtered = CONNECTORS.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "all" || c.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar conector..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1.5">
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <Button key={key} size="sm" variant={category === key ? "default" : "outline"} onClick={() => setCategory(key)} className="text-xs">
              {label}
            </Button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((c) => (
          <IntegrationCard
            key={c.slug}
            connector={c}
            isConnected={connectedSlugs.includes(c.slug)}
            onConnect={onConnect}
            onManage={onManage}
          />
        ))}
      </div>
      {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum conector encontrado.</p>}
    </div>
  );
}
