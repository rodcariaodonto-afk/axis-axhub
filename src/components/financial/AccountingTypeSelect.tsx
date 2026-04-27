import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  PAYABLE_ACCOUNTING_OPTIONS,
  RECEIVABLE_ACCOUNTING_OPTIONS,
  AccountingTypeOption,
} from "./types";

/**
 * Select reutilizável para classificação contábil.
 * Aceita o tipo de lançamento ('payable' ou 'receivable') e exibe
 * as opções correspondentes.
 *
 * Uso:
 * <AccountingTypeSelect
 *   kind="payable"
 *   value={form.accounting_type}
 *   onChange={(v) => setForm({ ...form, accounting_type: v })}
 * />
 */

interface AccountingTypeSelectProps {
  kind: "payable" | "receivable";
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
}

export function AccountingTypeSelect({
  kind,
  value,
  onChange,
  label = "Classificação Contábil",
  required = false,
}: AccountingTypeSelectProps) {
  const options: AccountingTypeOption[] =
    kind === "payable" ? PAYABLE_ACCOUNTING_OPTIONS : RECEIVABLE_ACCOUNTING_OPTIONS;

  return (
    <div className="space-y-2">
      <Label>
        {label}{" "}
        {!required && (
          <span className="text-muted-foreground text-xs font-normal">(opcional)</span>
        )}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione a classificação" />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              <div className="flex flex-col items-start">
                <span>{opt.label}</span>
                {opt.description && (
                  <span className="text-xs text-muted-foreground">{opt.description}</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
