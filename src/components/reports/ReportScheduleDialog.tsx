import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  reportId: string;
  reportTitle: string;
}

export function ReportScheduleDialog({ open, onClose, reportId, reportTitle }: Props) {
  const { user } = useAuth();
  const [frequency, setFrequency] = useState("weekly");
  const [emails, setEmails] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    const emailList = emails.split(",").map((e) => e.trim()).filter(Boolean);
    if (emailList.length === 0) { toast.error("Adicione ao menos um e-mail"); return; }

    setSaving(true);
    const tenantId = (await supabase.rpc("get_user_tenant_id")).data;

    const { error } = await supabase.from("report_schedules").insert({
      tenant_id: tenantId!,
      report_id: reportId,
      frequency,
      recipients: emailList,
      is_active: true,
    });

    setSaving(false);
    if (error) { toast.error("Erro ao agendar: " + error.message); return; }
    toast.success("Agendamento criado com sucesso!");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Agendar Relatório</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Relatório</Label>
            <Input value={reportTitle} disabled />
          </div>
          <div>
            <Label>Frequência</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Diário</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="monthly">Mensal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>E-mails destinatários (separados por vírgula)</Label>
            <Input value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="email1@ex.com, email2@ex.com" />
          </div>
          <p className="text-xs text-muted-foreground">
            O envio automático será ativado quando o serviço de e-mail estiver configurado.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Agendar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
