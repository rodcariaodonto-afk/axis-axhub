import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { getUserTenantId } from "@/lib/getUserTenantId";

export default function PoliciesTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ retention_days: 30, export_expiration_hours: 72, dsr_sla_days: 15 });

  const { data: policy } = useQuery({
    queryKey: ["governance-policy"],
    queryFn: async () => (await supabase.from("data_governance_policies").select("*").maybeSingle()).data,
  });

  useEffect(() => {
    if (policy) setForm({
      retention_days: policy.retention_days,
      export_expiration_hours: policy.export_expiration_hours,
      dsr_sla_days: policy.dsr_sla_days ?? 15,
    });
  }, [policy]);

  const save = useMutation({
    mutationFn: async () => {
      const tenantId = await getUserTenantId();
      const { data: { user } } = await supabase.auth.getUser();
      const payload = { tenant_id: tenantId!, ...form, updated_by: user?.id };
      const { error } = await supabase.from("data_governance_policies").upsert(payload, { onConflict: "tenant_id" });
      if (error) throw error;
      await supabase.from("audit_logs").insert({
        tenant_id: tenantId!, actor_user_id: user?.id,
        action: "governance.policy.updated", entity: "data_governance_policies",
        event_type: "governance", severity: "warning", metadata: form,
      });
    },
    onSuccess: () => { toast({ title: "Política salva" }); qc.invalidateQueries({ queryKey: ["governance-policy"] }); },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return (
    <Card className="p-6 max-w-xl space-y-4">
      <div>
        <Label>Retenção pós-cancelamento (dias)</Label>
        <Input type="number" min={7} max={365} value={form.retention_days} onChange={(e) => setForm({ ...form, retention_days: Number(e.target.value) })} />
        <p className="text-xs text-muted-foreground mt-1">Período em que os dados ficam disponíveis após o cancelamento.</p>
      </div>
      <div>
        <Label>Expiração de exportações (horas)</Label>
        <Input type="number" min={1} max={720} value={form.export_expiration_hours} onChange={(e) => setForm({ ...form, export_expiration_hours: Number(e.target.value) })} />
      </div>
      <div>
        <Label>SLA de pedidos dos titulares (dias)</Label>
        <Input type="number" min={1} max={90} value={form.dsr_sla_days} onChange={(e) => setForm({ ...form, dsr_sla_days: Number(e.target.value) })} />
      </div>
      <Button onClick={() => save.mutate()}>Salvar política</Button>
    </Card>
  );
}
