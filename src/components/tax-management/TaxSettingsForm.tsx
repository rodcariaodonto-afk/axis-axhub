import { useState, useEffect } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { TaxRetentionBreakdown } from "./TaxRetentionBreakdown";
import {
  useTaxSettingsForPJ,
  useSaveTaxSettings,
  REGIME_LABELS,
  SUGGESTED_RATES,
  type RegimeTributario,
  type SaveTaxSettingsInput,
} from "@/hooks/useTaxSettings";

const REGIMES = Object.entries(REGIME_LABELS) as [RegimeTributario, string][];

const schema = z.object({
  regime_tributario: z.enum(["simples_nacional", "lucro_presumido", "lucro_real", "mei"]),
  aliquota_ir:     z.coerce.number().min(0).max(100),
  aliquota_pis:    z.coerce.number().min(0).max(100),
  aliquota_cofins: z.coerce.number().min(0).max(100),
  aliquota_inss:   z.coerce.number().min(0).max(100),
  aliquota_iss:    z.coerce.number().min(0).max(100),
  aliquota_csll:   z.coerce.number().min(0).max(100),
});

type FormValues = z.infer<typeof schema>;

const DEFAULT_VALUES: FormValues = {
  regime_tributario: "simples_nacional",
  aliquota_ir: 0, aliquota_pis: 0, aliquota_cofins: 0,
  aliquota_inss: 0, aliquota_iss: 0, aliquota_csll: 0,
};

const RATE_FIELDS: { key: keyof Omit<FormValues, "regime_tributario">; label: string }[] = [
  { key: "aliquota_ir",     label: "IR" },
  { key: "aliquota_pis",    label: "PIS" },
  { key: "aliquota_cofins", label: "COFINS" },
  { key: "aliquota_inss",   label: "INSS" },
  { key: "aliquota_iss",    label: "ISS" },
  { key: "aliquota_csll",   label: "CSLL" },
];

interface Props {
  pjId: string;
  pjName?: string;
  onSave?: () => void;
  previewAmount?: number;
}

export function TaxSettingsForm({ pjId, pjName, onSave, previewAmount = 10000 }: Props) {
  const { data: existing } = useTaxSettingsForPJ(pjId);
  const save = useSaveTaxSettings();
  const { toast } = useToast();

  const [values, setValues] = useState<FormValues>(DEFAULT_VALUES);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [initialized, setInitialized] = useState(false);

  // Initialize from existing settings when loaded
  useEffect(() => {
    if (!initialized && existing !== undefined) {
      if (existing) {
        setValues({
          regime_tributario: existing.regime_tributario as RegimeTributario,
          aliquota_ir:     Number(existing.aliquota_ir),
          aliquota_pis:    Number(existing.aliquota_pis),
          aliquota_cofins: Number(existing.aliquota_cofins),
          aliquota_inss:   Number(existing.aliquota_inss),
          aliquota_iss:    Number(existing.aliquota_iss),
          aliquota_csll:   Number(existing.aliquota_csll),
        });
      }
      setInitialized(true);
    }
  }, [existing, initialized]);

  function handleRegimeChange(regime: RegimeTributario) {
    const suggested = SUGGESTED_RATES[regime];
    setValues({ regime_tributario: regime, ...suggested });
    setErrors({});
  }

  function setRate(key: keyof Omit<FormValues, "regime_tributario">, raw: string) {
    const v = raw === "" ? 0 : Number(raw);
    setValues((prev) => ({ ...prev, [key]: isNaN(v) ? 0 : v }));
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
    try {
      const input = { pjId, ...result.data } as SaveTaxSettingsInput;
      await save.mutateAsync(input);
      toast({ title: "Configuração salva com sucesso" });
      onSave?.();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro ao salvar", description: e.message });
    }
  }

  return (
    <div className="space-y-6">
      {pjName && (
        <p className="text-sm font-medium text-muted-foreground">
          Configuração de impostos para <span className="text-foreground">{pjName}</span>
        </p>
      )}

      {/* Regime */}
      <div className="space-y-1.5">
        <Label>Regime tributário</Label>
        <Select value={values.regime_tributario} onValueChange={(v) => handleRegimeChange(v as RegimeTributario)}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REGIMES.map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(values.regime_tributario === "simples_nacional" || values.regime_tributario === "mei") && (
          <p className="text-xs text-muted-foreground">
            Simples Nacional e MEI geralmente não sofrem retenções. Alíquotas zeradas por padrão.
          </p>
        )}
      </div>

      {/* Rate fields */}
      <div className="space-y-3">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Alíquotas de retenção (%)</Label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {RATE_FIELDS.map(({ key, label }) => (
            <div key={key} className="space-y-1.5">
              <Label className="text-sm">{label}</Label>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={values[key] === 0 ? "" : values[key]}
                  onChange={(e) => setRate(key, e.target.value)}
                  placeholder="0"
                  className="pr-7"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
              {errors[key] && <p className="text-xs text-destructive">{errors[key]}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Preview breakdown */}
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Preview — simulação para {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(previewAmount)}
        </p>
        <TaxRetentionBreakdown
          valorBruto={previewAmount}
          ir={values.aliquota_ir}
          pis={values.aliquota_pis}
          cofins={values.aliquota_cofins}
          inss={values.aliquota_inss}
          iss={values.aliquota_iss}
          csll={values.aliquota_csll}
        />
      </div>

      <Button onClick={handleSubmit} disabled={save.isPending} className="w-full sm:w-auto">
        {save.isPending ? "Salvando..." : "Salvar configuração"}
      </Button>
    </div>
  );
}
