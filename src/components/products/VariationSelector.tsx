
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VARIATION_TYPES, VariationConfig } from "@/lib/productUtils";
import { Plus, X } from "lucide-react";

interface VariationSelectorProps {
  configs: VariationConfig[];
  onChange: (configs: VariationConfig[]) => void;
}

export default function VariationSelector({ configs, onChange }: VariationSelectorProps) {
  const [selectedType, setSelectedType] = useState("");
  const [customValue, setCustomValue] = useState("");

  const usedTypes = configs.map((c) => c.type);
  const availableTypes = VARIATION_TYPES.filter((t) => !usedTypes.includes(t.value));

  const addVariationType = () => {
    if (!selectedType) return;
    const preset = VARIATION_TYPES.find((t) => t.value === selectedType);
    onChange([...configs, { type: selectedType, values: preset?.options.slice(0, 3) || [] }]);
    setSelectedType("");
  };

  const removeVariationType = (index: number) => {
    onChange(configs.filter((_, i) => i !== index));
  };

  const toggleValue = (configIndex: number, value: string) => {
    const updated = [...configs];
    const values = updated[configIndex].values;
    if (values.includes(value)) {
      updated[configIndex] = { ...updated[configIndex], values: values.filter((v) => v !== value) };
    } else {
      updated[configIndex] = { ...updated[configIndex], values: [...values, value] };
    }
    onChange(updated);
  };

  const addCustomValue = (configIndex: number) => {
    if (!customValue.trim()) return;
    const updated = [...configs];
    if (!updated[configIndex].values.includes(customValue.trim())) {
      updated[configIndex] = { ...updated[configIndex], values: [...updated[configIndex].values, customValue.trim()] };
      onChange(updated);
    }
    setCustomValue("");
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="flex-1"><SelectValue placeholder="Adicionar tipo de variação..." /></SelectTrigger>
          <SelectContent>
            {availableTypes.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" onClick={addVariationType} disabled={!selectedType} size="icon">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {configs.map((config, ci) => {
        const typeInfo = VARIATION_TYPES.find((t) => t.value === config.type);
        return (
          <div key={config.type} className="border border-border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="font-medium">{typeInfo?.label || config.type}</Label>
              <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeVariationType(ci)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {typeInfo?.options.map((opt) => (
                <Badge
                  key={opt}
                  variant={config.values.includes(opt) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleValue(ci, opt)}
                >
                  {opt}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Valor personalizado..."
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomValue(ci))}
                className="text-sm h-8"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => addCustomValue(ci)}>
                Adicionar
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
