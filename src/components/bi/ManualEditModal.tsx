import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface ManualEditModalProps {
  open: boolean;
  onClose: () => void;
  widgetId: string;
  widgetTitle: string;
  tenantId: string;
}

export function ManualEditModal({ open, onClose, widgetId, widgetTitle, tenantId }: ManualEditModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [eventType, setEventType] = useState("");
  const [adjustmentDate, setAdjustmentDate] = useState("");
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");

  const addAdjustment = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("bi_manual_adjustments" as any).insert({
        tenant_id: tenantId,
        user_id: user!.id,
        event_type: eventType,
        adjustment_date: adjustmentDate,
        value: parseFloat(value),
        description: description || null,
        widget_id: widgetId,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bi-widget", widgetId] });
      toast.success("Ajuste manual adicionado!");
      resetAndClose();
    },
    onError: () => toast.error("Erro ao adicionar ajuste"),
  });

  const resetAndClose = () => {
    setEventType("");
    setAdjustmentDate("");
    setValue("");
    setDescription("");
    onClose();
  };

  const isValid = eventType.trim() && adjustmentDate && value && !isNaN(parseFloat(value));

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajuste Manual — {widgetTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Tipo de Evento</Label>
            <Input value={eventType} onChange={(e) => setEventType(e.target.value)} placeholder="Ex: venda_manual" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Data</Label>
              <Input type="date" value={adjustmentDate} onChange={(e) => setAdjustmentDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Valor</Label>
              <Input type="number" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Descrição (opcional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Motivo do ajuste..." rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose}>Cancelar</Button>
          <Button onClick={() => addAdjustment.mutate()} disabled={!isValid || addAdjustment.isPending}>
            {addAdjustment.isPending ? "Salvando..." : "Adicionar Ajuste"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
