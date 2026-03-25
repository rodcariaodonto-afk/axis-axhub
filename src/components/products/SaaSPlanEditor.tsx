import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { BILLING_CYCLES, SaaSPlan, generatePlanSKU } from "@/lib/productUtils";

interface SaaSPlanEditorProps {
  plans: SaaSPlan[];
  onChange: (plans: SaaSPlan[]) => void;
  baseSku: string;
}

export default function SaaSPlanEditor({ plans, onChange, baseSku }: SaaSPlanEditorProps) {
  const addPlan = () => {
    const newPlan: SaaSPlan = {
      tier: "",
      sku: "",
      billing_cycle: "monthly",
      price: 0,
      cost: 0,
      setup_fee: 0,
      trial_days: 0,
      annual_discount_percent: 0,
    };
    onChange([...plans, newPlan]);
  };

  const updatePlan = (index: number, field: keyof SaaSPlan, value: string | number) => {
    const updated = [...plans];
    (updated[index] as any)[field] = value;
    // Auto-generate SKU when tier or cycle changes
    if (field === "tier" || field === "billing_cycle") {
      updated[index].sku = generatePlanSKU(
        baseSku || "SAAS",
        updated[index].tier,
        updated[index].billing_cycle
      );
    }
    onChange(updated);
  };

  const removePlan = (index: number) => {
    onChange(plans.filter((_, i) => i !== index));
  };

  const calcMargin = (price: number, cost: number) => {
    if (price <= 0) return "—";
    return ((((price - cost) / price) * 100)).toFixed(1) + "%";
  };

  return (
    <div className="space-y-3">
      {plans.map((plan, i) => (
        <Card key={i} className="border-border">
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">Plano {i + 1}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removePlan(i)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nome do Tier *</Label>
                <Input
                  value={plan.tier}
                  onChange={(e) => updatePlan(i, "tier", e.target.value)}
                  placeholder="Ex: Basic, Pro, Enterprise"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">SKU (auto)</Label>
                <Input value={plan.sku} readOnly className="h-8 text-sm bg-muted font-mono" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Ciclo *</Label>
                <Select value={plan.billing_cycle} onValueChange={(v) => updatePlan(i, "billing_cycle", v)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BILLING_CYCLES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Preço *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={plan.price || ""}
                  onChange={(e) => updatePlan(i, "price", parseFloat(e.target.value) || 0)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Custo</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={plan.cost || ""}
                  onChange={(e) => updatePlan(i, "cost", parseFloat(e.target.value) || 0)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Setup Fee</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={plan.setup_fee || ""}
                  onChange={(e) => updatePlan(i, "setup_fee", parseFloat(e.target.value) || 0)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Trial (dias)</Label>
                <Input
                  type="number"
                  value={plan.trial_days || ""}
                  onChange={(e) => updatePlan(i, "trial_days", parseInt(e.target.value) || 0)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Desc. Anual %</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={plan.annual_discount_percent || ""}
                  onChange={(e) => updatePlan(i, "annual_discount_percent", parseFloat(e.target.value) || 0)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Margem</Label>
                <div className="h-8 flex items-center text-sm font-medium text-primary">
                  {calcMargin(plan.price, plan.cost)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      <Button type="button" variant="outline" onClick={addPlan} className="w-full">
        <Plus className="mr-2 h-4 w-4" />Adicionar Plano
      </Button>
    </div>
  );
}
