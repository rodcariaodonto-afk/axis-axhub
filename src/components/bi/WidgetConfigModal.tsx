import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface WidgetConfigModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (config: { title: string; chart_type: string; metric: string; dimension: string; aggregation: string }) => void;
}

export function WidgetConfigModal({ open, onClose, onSave }: WidgetConfigModalProps) {
  const [title, setTitle] = useState("");
  const [chartType, setChartType] = useState("bar");
  const [metric, setMetric] = useState("value");
  const [dimension, setDimension] = useState("event_type");
  const [aggregation, setAggregation] = useState("sum");

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({ title, chart_type: chartType, metric, dimension, aggregation });
    setTitle("");
    setChartType("bar");
    setMetric("value");
    setDimension("event_type");
    setAggregation("sum");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Widget</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Vendas por Mês" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Tipo de Gráfico</Label>
              <Select value={chartType} onValueChange={setChartType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">Barras</SelectItem>
                  <SelectItem value="line">Linhas</SelectItem>
                  <SelectItem value="pie">Pizza</SelectItem>
                  <SelectItem value="kpi">KPI Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Métrica</Label>
              <Select value={metric} onValueChange={setMetric}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="value">Valor</SelectItem>
                  <SelectItem value="quantity">Quantidade</SelectItem>
                  <SelectItem value="count">Contagem</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Dimensão</Label>
              <Select value={dimension} onValueChange={setDimension}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="event_type">Tipo de Evento</SelectItem>
                  <SelectItem value="customer">Cliente</SelectItem>
                  <SelectItem value="product">Produto</SelectItem>
                  <SelectItem value="month">Mês</SelectItem>
                  <SelectItem value="week">Semana</SelectItem>
                  <SelectItem value="day">Dia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Agregação</Label>
              <Select value={aggregation} onValueChange={setAggregation}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sum">Soma</SelectItem>
                  <SelectItem value="count">Contagem</SelectItem>
                  <SelectItem value="avg">Média</SelectItem>
                  <SelectItem value="min">Mínimo</SelectItem>
                  <SelectItem value="max">Máximo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!title.trim()}>Adicionar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
