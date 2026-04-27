/**
 * Tipos de classificação contábil para o módulo financeiro do AXIS.
 * Mantém alinhamento com os CHECK constraints definidos em
 * supabase/migrations/20260427181633_financial_accounting_module.sql
 */

export type AccountingTypePayable =
  | "custo_operacional"
  | "despesa_administrativa"
  | "despesa_comercial"
  | "despesa_financeira"
  | "investimento"
  | "passivo_circulante"
  | "passivo_nao_circulante";

export type AccountingTypeReceivable =
  | "receita_operacional"
  | "receita_financeira"
  | "receita_nao_operacional"
  | "ativo_circulante"
  | "ativo_nao_circulante";

export type AccountingType = AccountingTypePayable | AccountingTypeReceivable;

export interface AccountingTypeOption {
  value: string;
  label: string;
  description?: string;
}

export const PAYABLE_ACCOUNTING_OPTIONS: AccountingTypeOption[] = [
  { value: "custo_operacional", label: "Custo Operacional (CMV)", description: "Custos diretos de produção/serviço" },
  { value: "despesa_administrativa", label: "Despesa Administrativa", description: "Aluguel, salários administrativos, contabilidade" },
  { value: "despesa_comercial", label: "Despesa Comercial", description: "Marketing, comissões de vendas" },
  { value: "despesa_financeira", label: "Despesa Financeira", description: "Juros, tarifas bancárias" },
  { value: "investimento", label: "Investimento / Ativo", description: "Compra de ativo imobilizado" },
  { value: "passivo_circulante", label: "Passivo Circulante", description: "Obrigações de curto prazo (até 12 meses)" },
  { value: "passivo_nao_circulante", label: "Passivo Não Circulante", description: "Obrigações de longo prazo (acima de 12 meses)" },
];

export const RECEIVABLE_ACCOUNTING_OPTIONS: AccountingTypeOption[] = [
  { value: "receita_operacional", label: "Receita Operacional", description: "Receita principal do negócio" },
  { value: "receita_financeira", label: "Receita Financeira", description: "Juros recebidos, rendimentos" },
  { value: "receita_nao_operacional", label: "Receita Não Operacional", description: "Venda de ativo, receita eventual" },
  { value: "ativo_circulante", label: "Ativo Circulante", description: "Direitos realizáveis em até 12 meses" },
  { value: "ativo_nao_circulante", label: "Ativo Não Circulante", description: "Direitos realizáveis em mais de 12 meses" },
];

export const ACCOUNTING_TYPE_COLORS: Record<string, string> = {
  custo_operacional: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30 dark:text-yellow-400",
  despesa_administrativa: "bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-400",
  despesa_comercial: "bg-orange-500/15 text-orange-700 border-orange-500/30 dark:text-orange-400",
  despesa_financeira: "bg-pink-500/15 text-pink-700 border-pink-500/30 dark:text-pink-400",
  investimento: "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-400",
  passivo_circulante: "bg-gray-500/15 text-gray-700 border-gray-500/30 dark:text-gray-400",
  passivo_nao_circulante: "bg-slate-500/15 text-slate-700 border-slate-500/30 dark:text-slate-400",
  receita_operacional: "bg-green-500/15 text-green-700 border-green-500/30 dark:text-green-400",
  receita_financeira: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400",
  receita_nao_operacional: "bg-teal-500/15 text-teal-700 border-teal-500/30 dark:text-teal-400",
  ativo_circulante: "bg-cyan-500/15 text-cyan-700 border-cyan-500/30 dark:text-cyan-400",
  ativo_nao_circulante: "bg-sky-500/15 text-sky-700 border-sky-500/30 dark:text-sky-400",
};

export const ACCOUNTING_TYPE_LABELS: Record<string, string> = {
  custo_operacional: "Custo Operacional",
  despesa_administrativa: "Despesa Adm.",
  despesa_comercial: "Despesa Comercial",
  despesa_financeira: "Despesa Financeira",
  investimento: "Investimento",
  passivo_circulante: "Passivo Circ.",
  passivo_nao_circulante: "Passivo N. Circ.",
  receita_operacional: "Receita Operacional",
  receita_financeira: "Receita Financeira",
  receita_nao_operacional: "Receita N. Op.",
  ativo_circulante: "Ativo Circ.",
  ativo_nao_circulante: "Ativo N. Circ.",
};
