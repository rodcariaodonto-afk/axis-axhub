import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface DocumentationSearchProps {
  search: string;
  onSearchChange: (v: string) => void;
  niche: string;
  onNicheChange: (v: string) => void;
  category: string;
  onCategoryChange: (v: string) => void;
  niches: string[];
  categories: string[];
}

export function DocumentationSearch({
  search, onSearchChange, niche, onNicheChange, category, onCategoryChange, niches, categories,
}: DocumentationSearchProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar na documentação..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select value={niche} onValueChange={onNicheChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Nicho" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os nichos</SelectItem>
          {niches.map((n) => (
            <SelectItem key={n} value={n}>{n}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={category} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas categorias</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
