import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePJProviders, useCreateRepasse } from "@/hooks/useRepasseAdmin";
import { toast } from "sonner";

const schema = z.object({
  pjId: z.string().uuid("Selecione um PJ"),
  valor: z
    .string()
    .min(1, "Informe o valor")
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Valor deve ser maior que zero"),
  dataRepasse: z.string().min(1, "Informe a data do repasse"),
  descricao: z.string().optional(),
  contractId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;
type FormErrors = Partial<Record<keyof FormValues, string>>;

interface Props {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function RepasseCreateForm({ onSuccess, onCancel }: Props) {
  const [form, setForm] = useState<FormValues>({
    pjId: "",
    valor: "",
    dataRepasse: new Date().toISOString().split("T")[0],
    descricao: "",
    contractId: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const { data: providers = [], isLoading: loadingProviders } = usePJProviders();
  const createRepasse = useCreateRepasse();

  const { data: contracts = [] } = useQuery({
    queryKey: ["contracts-by-pj", form.pjId],
    enabled: !!form.pjId,
    staleTime: 2 * 60_000,
    queryFn: async () => {
      if (!form.pjId) return [];
      const { data, error } = await supabase
        .from("contracts")
        .select("id, name")
        .eq("account_id", form.pjId)
        .eq("is_active", true)
        .order("name");
      if (error) return [];
      return (data ?? []) as { id: string; name: string }[];
    },
  });

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = schema.safeParse(form);
    if (!result.success) {
      const errs: FormErrors = {};
      result.error.errors.forEach((err) => {
        const k = err.path[0] as keyof FormValues;
        if (!errs[k]) errs[k] = err.message;
      });
      setErrors(errs);
      return;
    }

    try {
      await createRepasse.mutateAsync({
        pjId: form.pjId,
        valor: Number(form.valor),
        dataRepasse: form.dataRepasse,
        descricao: form.descricao || undefined,
        contractId: form.contractId || null,
      });
      toast.success("Repasse criado com sucesso");
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao criar repasse");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* PJ */}
      <div className="space-y-1.5">
        <Label>Pessoa Jurídica <span className="text-destructive">*</span></Label>
        <Select value={form.pjId} onValueChange={(v) => set("pjId", v)} disabled={loadingProviders}>
          <SelectTrigger className={errors.pjId ? "border-destructive" : ""}>
            <SelectValue placeholder={loadingProviders ? "Carregando..." : "Selecione o PJ"} />
          </SelectTrigger>
          <SelectContent>
            {providers.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}{p.cnpj ? ` — ${p.cnpj}` : ""}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.pjId && <p className="text-xs text-destructive">{errors.pjId}</p>}
      </div>

      {/* Valor */}
      <div className="space-y-1.5">
        <Label>Valor (R$) <span className="text-destructive">*</span></Label>
        <Input
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0,00"
          value={form.valor}
          onChange={(e) => set("valor", e.target.value)}
          className={errors.valor ? "border-destructive" : ""}
        />
        {errors.valor && <p className="text-xs text-destructive">{errors.valor}</p>}
      </div>

      {/* Data */}
      <div className="space-y-1.5">
        <Label>Data do repasse <span className="text-destructive">*</span></Label>
        <Input
          type="date"
          value={form.dataRepasse}
          onChange={(e) => set("dataRepasse", e.target.value)}
          className={errors.dataRepasse ? "border-destructive" : ""}
        />
        {errors.dataRepasse && <p className="text-xs text-destructive">{errors.dataRepasse}</p>}
      </div>

      {/* Contrato vinculado (opcional) */}
      <div className="space-y-1.5">
        <Label>Contrato vinculado <span className="text-muted-foreground text-xs">(opcional)</span></Label>
        <Select value={form.contractId ?? ""} onValueChange={(v) => set("contractId", v)} disabled={!form.pjId}>
          <SelectTrigger>
            <SelectValue placeholder={!form.pjId ? "Selecione um PJ primeiro" : "Selecione o contrato"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Nenhum</SelectItem>
            {contracts.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Descrição */}
      <div className="space-y-1.5">
        <Label>Descrição <span className="text-muted-foreground text-xs">(opcional)</span></Label>
        <Textarea
          placeholder="Descreva o repasse..."
          rows={2}
          value={form.descricao}
          onChange={(e) => set("descricao", e.target.value)}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={createRepasse.isPending}>
          {createRepasse.isPending ? "Criando..." : "Criar Repasse"}
        </Button>
      </div>
    </form>
  );
}
