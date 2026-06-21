import { useState, useEffect } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { usePJProviders } from "@/hooks/useRepasseAdmin";
import {
  useCreateRepasseSchedule,
  useUpdateRepasseSchedule,
  useBankAccounts,
  FREQUENCIA_LABELS,
  type RepasseSchedule,
  type CreateScheduleInput,
  type Frequencia,
} from "@/hooks/useRepasseSchedule";

const schema = z.object({
  pj_id:          z.string().min(1, "Selecione o prestador PJ"),
  valor:          z.coerce.number().positive("Valor deve ser maior que zero"),
  tipo_valor:     z.enum(["fixo", "variavel"]),
  recorrente:     z.boolean(),
  frequencia:     z.enum(["diario", "semanal", "quinzenal", "mensal"]).optional().nullable(),
  dia_execucao:   z.coerce.number().min(1).max(31).optional().nullable(),
  proxima_data:   z.string().min(1, "Data obrigatória"),
  bank_account_id: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
  editing?: RepasseSchedule;
}

const DEFAULT: FormValues = {
  pj_id: "", valor: 0, tipo_valor: "fixo", recorrente: false,
  frequencia: null, dia_execucao: null,
  proxima_data: new Date().toISOString().slice(0, 10),
  bank_account_id: null,
};

export function RepasseScheduleForm({ onSuccess, onCancel, editing }: Props) {
  const { data: providers = [] } = usePJProviders();
  const { data: bankAccounts = [] } = useBankAccounts();
  const create = useCreateRepasseSchedule();
  const update = useUpdateRepasseSchedule();
  const { toast } = useToast();

  const [values, setValues] = useState<FormValues>(DEFAULT);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});

  useEffect(() => {
    if (editing) {
      setValues({
        pj_id:          editing.pj_id,
        valor:          editing.valor,
        tipo_valor:     editing.tipo_valor,
        recorrente:     editing.recorrente,
        frequencia:     editing.frequencia,
        dia_execucao:   editing.dia_execucao,
        proxima_data:   editing.proxima_data,
        bank_account_id: editing.bank_account_id,
      });
    }
  }, [editing]);

  function set<K extends keyof FormValues>(k: K, v: FormValues[K]) {
    setValues((prev) => ({ ...prev, [k]: v }));
  }

  async function handleSubmit() {
    const result = schema.safeParse(values);
    if (!result.success) {
      const errs: typeof errors = {};
      result.error.errors.forEach((e) => { errs[e.path[0] as keyof FormValues] = e.message; });
      setErrors(errs);
      return;
    }
    setErrors({});
    const data = result.data;
    const input: CreateScheduleInput = {
      pj_id:          data.pj_id,
      valor:          data.valor,
      tipo_valor:     data.tipo_valor,
      recorrente:     data.recorrente,
      frequencia:     data.recorrente ? (data.frequencia as Frequencia | null) : null,
      dia_execucao:   data.recorrente && data.frequencia === "mensal" ? (data.dia_execucao ?? null) : null,
      proxima_data:   data.proxima_data,
      bank_account_id: data.bank_account_id ?? null,
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, ...input });
        toast({ title: "Agendamento atualizado" });
      } else {
        await create.mutateAsync(input);
        toast({ title: "Agendamento criado com sucesso" });
      }
      onSuccess();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro ao salvar", description: e.message });
    }
  }

  const isPending = create.isPending || update.isPending;
  const isRecorrente = values.recorrente;
  const isMensal = values.frequencia === "mensal";

  return (
    <div className="space-y-5">
      {/* PJ */}
      <div className="space-y-1.5">
        <Label>Prestador PJ <span className="text-destructive">*</span></Label>
        <Select value={values.pj_id} onValueChange={(v) => set("pj_id", v)} disabled={!!editing}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o prestador..." />
          </SelectTrigger>
          <SelectContent>
            {providers.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {errors.pj_id && <p className="text-xs text-destructive">{errors.pj_id}</p>}
      </div>

      {/* Valor + tipo */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Valor (R$) <span className="text-destructive">*</span></Label>
          <Input
            type="number" min={0.01} step={0.01}
            value={values.valor || ""}
            onChange={(e) => set("valor", e.target.value as unknown as number)}
            placeholder="0,00"
          />
          {errors.valor && <p className="text-xs text-destructive">{errors.valor}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Tipo de valor</Label>
          <Select value={values.tipo_valor} onValueChange={(v) => set("tipo_valor", v as "fixo" | "variavel")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="fixo">Fixo</SelectItem>
              <SelectItem value="variavel">Variável</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Recorrente toggle */}
      <div className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
        <Switch
          checked={values.recorrente}
          onCheckedChange={(v) => {
            set("recorrente", v);
            if (!v) { set("frequencia", null); set("dia_execucao", null); }
          }}
          id="recorrente"
        />
        <Label htmlFor="recorrente" className="cursor-pointer">
          Repasse recorrente
        </Label>
      </div>

      {/* Frequência (quando recorrente) */}
      {isRecorrente && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Frequência</Label>
            <Select
              value={values.frequencia ?? ""}
              onValueChange={(v) => { set("frequencia", v as Frequencia); if (v !== "mensal") set("dia_execucao", null); }}
            >
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {(Object.entries(FREQUENCIA_LABELS) as [Frequencia, string][]).map(([k, label]) => (
                  <SelectItem key={k} value={k}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isMensal && (
            <div className="space-y-1.5">
              <Label>Dia do mês</Label>
              <Input
                type="number" min={1} max={31}
                value={values.dia_execucao ?? ""}
                onChange={(e) => set("dia_execucao", e.target.value ? Number(e.target.value) : null)}
                placeholder="Ex: 10"
              />
              <p className="text-xs text-muted-foreground">Dias maiores que o mês: usa o último dia</p>
            </div>
          )}
        </div>
      )}

      {/* Próxima data */}
      <div className="space-y-1.5">
        <Label>{isRecorrente ? "Primeira execução" : "Data do repasse"} <span className="text-destructive">*</span></Label>
        <Input
          type="date"
          value={values.proxima_data}
          onChange={(e) => set("proxima_data", e.target.value)}
          className="w-48"
        />
        {errors.proxima_data && <p className="text-xs text-destructive">{errors.proxima_data}</p>}
      </div>

      {/* Conta bancária */}
      {bankAccounts.length > 0 && (
        <div className="space-y-1.5">
          <Label>Conta bancária de origem</Label>
          <Select
            value={values.bank_account_id ?? "none"}
            onValueChange={(v) => set("bank_account_id", v === "none" ? null : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Nenhuma (opcional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhuma</SelectItem>
              {bankAccounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Salvando..." : editing ? "Salvar alterações" : "Criar agendamento"}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={isPending}>Cancelar</Button>
      </div>
    </div>
  );
}
