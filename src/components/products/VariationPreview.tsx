
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { GeneratedVariation } from "@/lib/productUtils";
import { Badge } from "@/components/ui/badge";

interface VariationPreviewProps {
  variations: GeneratedVariation[];
  onChange: (variations: GeneratedVariation[]) => void;
}

export default function VariationPreview({ variations, onChange }: VariationPreviewProps) {
  if (variations.length === 0) return null;

  const updateVariation = (index: number, field: "price" | "cost" | "stock", value: string) => {
    const updated = [...variations];
    updated[index] = { ...updated[index], [field]: parseFloat(value) || 0 };
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Variações Geradas ({variations.length})</p>
        <Badge variant="outline" className="text-xs">{variations.length} SKUs</Badge>
      </div>
      <div className="border border-border rounded-lg overflow-auto max-h-64">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead className="text-xs">SKU</TableHead>
              <TableHead className="text-xs">Variação</TableHead>
              <TableHead className="text-xs text-right w-24">Preço</TableHead>
              <TableHead className="text-xs text-right w-24">Custo</TableHead>
              <TableHead className="text-xs text-right w-20">Estoque</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {variations.map((v, i) => (
              <TableRow key={v.sku} className="border-border">
                <TableCell className="font-mono text-xs py-1">{v.sku}</TableCell>
                <TableCell className="text-xs py-1">
                  {Object.entries(v.values).map(([, val]) => val).join(" / ")}
                </TableCell>
                <TableCell className="py-1">
                  <Input type="number" step="0.01" className="h-7 text-xs text-right" value={v.price} onChange={(e) => updateVariation(i, "price", e.target.value)} />
                </TableCell>
                <TableCell className="py-1">
                  <Input type="number" step="0.01" className="h-7 text-xs text-right" value={v.cost} onChange={(e) => updateVariation(i, "cost", e.target.value)} />
                </TableCell>
                <TableCell className="py-1">
                  <Input type="number" className="h-7 text-xs text-right" value={v.stock} onChange={(e) => updateVariation(i, "stock", e.target.value)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
