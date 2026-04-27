/**
 * Funções puras de cálculo do DRE (Demonstração do Resultado do Exercício).
 * Não fazem fetch nem têm efeitos colaterais — apenas matemática contábil.
 *
 * Spec: docs/financeiro-contabil/spec.md secao 3.2
 */

export interface DRELineItem {
  amount: number;
  accounting_type: string | null;
}

export interface DREInput {
  receivables: DRELineItem[];
  payables: DRELineItem[];
}

export interface DREOutput {
  receitaBruta: number;
  receitaOperacional: number;
  receitaNaoOperacional: number;
  receitaFinanceira: number;
  receitaLiquida: number;
  custoOperacional: number;
  lucroBruto: number;
  despesaAdministrativa: number;
  despesaComercial: number;
  despesaFinanceira: number;
  despesasOperacionais: number;
  resultadoOperacional: number;
  investimentos: number;
  resultadoLiquido: number;
  margemBruta: number | null;
  margemLiquida: number | null;
  // Lançamentos não classificados (separados do cálculo oficial)
  receitasNaoClassificadas: number;
  despesasNaoClassificadas: number;
}

const sumByType = (items: DRELineItem[], type: string): number =>
  items
    .filter((i) => i.accounting_type === type)
    .reduce((acc, i) => acc + Number(i.amount || 0), 0);

const sumNullType = (items: DRELineItem[]): number =>
  items
    .filter((i) => !i.accounting_type)
    .reduce((acc, i) => acc + Number(i.amount || 0), 0);

export function calculateDRE(input: DREInput): DREOutput {
  const { receivables, payables } = input;

  // Receitas
  const receitaOperacional = sumByType(receivables, "receita_operacional");
  const receitaNaoOperacional = sumByType(receivables, "receita_nao_operacional");
  const receitaFinanceira = sumByType(receivables, "receita_financeira");
  const receitaBruta = receitaOperacional + receitaNaoOperacional;
  const receitasNaoClassificadas = sumNullType(receivables);

  // v1: sem campo manual de Deduções da Receita → Receita Líquida = Receita Bruta
  const receitaLiquida = receitaBruta;

  // Custos e despesas
  const custoOperacional = sumByType(payables, "custo_operacional");
  const lucroBruto = receitaLiquida - custoOperacional;

  const despesaAdministrativa = sumByType(payables, "despesa_administrativa");
  const despesaComercial = sumByType(payables, "despesa_comercial");
  const despesaFinanceira = sumByType(payables, "despesa_financeira");
  const despesasOperacionais = despesaAdministrativa + despesaComercial + despesaFinanceira;

  const resultadoOperacional = lucroBruto - despesasOperacionais;

  const investimentos = sumByType(payables, "investimento");
  const resultadoLiquido = resultadoOperacional - investimentos + receitaFinanceira;

  const despesasNaoClassificadas = sumNullType(payables);

  // Margens
  const margemBruta = receitaBruta > 0 ? (lucroBruto / receitaBruta) * 100 : null;
  const margemLiquida = receitaBruta > 0 ? (resultadoLiquido / receitaBruta) * 100 : null;

  return {
    receitaBruta,
    receitaOperacional,
    receitaNaoOperacional,
    receitaFinanceira,
    receitaLiquida,
    custoOperacional,
    lucroBruto,
    despesaAdministrativa,
    despesaComercial,
    despesaFinanceira,
    despesasOperacionais,
    resultadoOperacional,
    investimentos,
    resultadoLiquido,
    margemBruta,
    margemLiquida,
    receitasNaoClassificadas,
    despesasNaoClassificadas,
  };
}

/**
 * Formata número como moeda BRL.
 */
export function fmt(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * Formata percentual com 1 casa decimal.
 */
export function fmtPct(value: number | null): string {
  if (value === null || isNaN(value)) return "—";
  return `${value.toFixed(1)}%`;
}

/**
 * Agrupa lançamentos por mês (YYYY-MM) somando os valores.
 * Útil para gráfico Receitas vs Despesas mensal.
 */
export interface MonthlyBucket {
  month: string; // "2026-01"
  receitas: number;
  despesas: number;
}

export function groupByMonth(
  receivables: Array<{ amount: number; paid_at: string | null }>,
  payables: Array<{ amount: number; paid_at: string | null }>
): MonthlyBucket[] {
  const map = new Map<string, MonthlyBucket>();

  const ensureBucket = (month: string): MonthlyBucket => {
    let b = map.get(month);
    if (!b) {
      b = { month, receitas: 0, despesas: 0 };
      map.set(month, b);
    }
    return b;
  };

  for (const r of receivables) {
    if (!r.paid_at) continue;
    const month = r.paid_at.slice(0, 7); // YYYY-MM
    ensureBucket(month).receitas += Number(r.amount || 0);
  }

  for (const p of payables) {
    if (!p.paid_at) continue;
    const month = p.paid_at.slice(0, 7);
    ensureBucket(month).despesas += Number(p.amount || 0);
  }

  return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Converte DRE para CSV exportável.
 */
export function dreToCSV(dre: DREOutput, periodLabel: string): string {
  const rows: Array<[string, string]> = [
    ["DRE - " + periodLabel, ""],
    ["", ""],
    ["(+) Receita Operacional", fmt(dre.receitaOperacional)],
    ["(+) Receita Nao Operacional", fmt(dre.receitaNaoOperacional)],
    ["(=) RECEITA BRUTA", fmt(dre.receitaBruta)],
    ["(-) Deducoes da Receita", fmt(0)],
    ["(=) RECEITA LIQUIDA", fmt(dre.receitaLiquida)],
    ["(-) Custos Operacionais (CMV)", fmt(dre.custoOperacional)],
    ["(=) LUCRO BRUTO", fmt(dre.lucroBruto)],
    ["(-) Despesas Administrativas", fmt(dre.despesaAdministrativa)],
    ["(-) Despesas Comerciais", fmt(dre.despesaComercial)],
    ["(-) Despesas Financeiras", fmt(dre.despesaFinanceira)],
    ["(=) RESULTADO OPERACIONAL", fmt(dre.resultadoOperacional)],
    ["(-) Investimentos", fmt(dre.investimentos)],
    ["(+) Receita Financeira", fmt(dre.receitaFinanceira)],
    ["(=) RESULTADO LIQUIDO", fmt(dre.resultadoLiquido)],
    ["", ""],
    ["Margem Bruta", fmtPct(dre.margemBruta)],
    ["Margem Liquida", fmtPct(dre.margemLiquida)],
    ["", ""],
    ["NAO CLASSIFICADO (revisar)", ""],
    ["Receitas sem classificacao", fmt(dre.receitasNaoClassificadas)],
    ["Despesas sem classificacao", fmt(dre.despesasNaoClassificadas)],
  ];

  return rows.map((r) => r.map((c) => `"${c}"`).join(";")).join("\n");
}
