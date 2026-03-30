import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { formatDocument, stripDocument } from "@/lib/documentMask";

interface CompanyForm {
  company_name: string;
  cnpj: string;
  address: string;
  segment: string;
}

export default function CompanyGeneral() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const form = useForm<CompanyForm>({ defaultValues: { company_name: "", cnpj: "", address: "", segment: "" } });

  const { data: tenantId } = useQuery({
    queryKey: ["my-tenant-id"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_user_tenant_id");
      return data as string;
    },
  });

  const { data: tenant } = useQuery({
    queryKey: ["tenant", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase.from("tenants").select("*").eq("id", tenantId!).single();
      return data;
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["company-settings", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase.from("company_settings").select("*").eq("tenant_id", tenantId!).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (tenant || settings) {
      form.reset({
        company_name: settings?.company_name || tenant?.name || "",
        cnpj: settings?.cnpj || tenant?.cnpj || "",
        address: settings?.address || "",
        segment: tenant?.segment || "",
      });
    }
  }, [tenant, settings]);

  const save = useMutation({
    mutationFn: async (values: CompanyForm) => {
      if (!tenantId) throw new Error("Sem tenant");
      // upsert company_settings
      const { error: e1 } = await supabase.from("company_settings").upsert(
        { tenant_id: tenantId, company_name: values.company_name, cnpj: values.cnpj, address: values.address },
        { onConflict: "tenant_id" }
      );
      if (e1) throw e1;
      // update tenant name/cnpj/segment
      const { error: e2 } = await supabase.from("tenants").update({ name: values.company_name, cnpj: values.cnpj, segment: values.segment }).eq("id", tenantId);
      if (e2) throw e2;
      // audit
      await supabase.from("audit_logs").insert({ tenant_id: tenantId, actor_user_id: user?.id, entity: "company_settings", action: "update", after_json: values as any });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenant"] });
      qc.invalidateQueries({ queryKey: ["company-settings"] });
      toast({ title: "Dados da empresa salvos com sucesso" });
    },
    onError: () => toast({ title: "Erro ao salvar", variant: "destructive" }),
  });

  return (
    <Card className="border-border bg-card">
      <CardHeader><CardTitle>Dados da Empresa</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="space-y-4 max-w-lg">
          <div className="space-y-1.5">
            <Label>Nome da Empresa</Label>
            <Input {...form.register("company_name")} />
          </div>
          <div className="space-y-1.5">
            <Label>CNPJ</Label>
            <Input {...form.register("cnpj")} />
          </div>
          <div className="space-y-1.5">
            <Label>Endereço</Label>
            <Input {...form.register("address")} />
          </div>
          <div className="space-y-1.5">
            <Label>Segmento</Label>
            <Input {...form.register("segment")} />
          </div>
          <Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando..." : "Salvar"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
