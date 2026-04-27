/**
 * Funções puras de cálculo do Balanço Patrimonial.
 * Não fazem fetch nem têm efeitos colaterais.
 *
 * Spec: docs/financeiro-contabil/spec.md secao 3.3
 *
 * Estrutura:
 *   ATIVO = Caixa + Receivables pendentes (até 12m) + Investimentos pagos + ajustes manuais ativo
 *   PASSIVO = Payables pendentes (até 12m) + ajustes manuais passivo
 *   PL = Resultado Acumulado Calculado + ajustes manuais (capital social, reservas)
 *
 * Equação contábil: ATIVO = PASSIVO + PL (tolerância R$ 0,01)
 */

export interface BankAccount {
  balance: number;
}

export interface ReceivableLite {
  amount: number;
  status: string;
  due_date: string;
  paid_at: string | null;
  accounting_type: string | null;
}

export interface PayableLite {
  amount: number;
  status: string;
  due_date: string;
  paid_at: string | null;
  accounting_type: string | null;
}

export interface BalanceSheetEntryLite {
  amount: number;
  entry_type: string;
  reference_date: string;
  account_name: string;
}

export interface BalanceInput {
  referenceDate: string; // YYYY-MM-DD
  bankAccounts: BankAccount[];
  receivables: ReceivableLite[];
  payables: PayableLite[];
  manualEntries: BalanceSheetEntryLite[];
}

export interface BalanceOutput {
  // Ativo
  caixaEquivalentes: number;
  contasReceber: number;
  ativoCirculanteManual: number;
  ativoCirculante: number;
  investimentosImobilizado: number;
  ativoNaoCirculanteManual: number;
  ativoNaoCirculante: number;
  ativoTotal: number;

  // Passivo
  contasPagar: number;
  passivoCirculanteManual: number;
  passivoCirculante: number;
  passivoNaoCirculanteManual: number;
  passivoNaoCirculante: number;
  passivoTotal: number;

  // Patrimônio Líquido
  resultadoAcumulado: number;
  patrimonioLiquidoManual: number;
  patrimonioLiquido: number;

  // Equação contábil
  passivoMaisPL: number;
  diferenca: number;
  equilibrado: boolean;

  // Detalhamento dos lançamentos manuais (para exibir agrupado)
  manualByType: Record<string, BalanceSheetEntryLite[]>;
}

const TOLERANCE = 0.01;

const sumManualByType = (
  entries: BalanceSheetEntryLite[],
  type: string,
  refDate: string
): number =>
  entries
    .filter((e) => e.entry_type === type && e.reference_date <= refDate)
    .reduce((acc, e) => acc + Number(e.amount || 0), 0);

const isWithinShortTerm = (dueDate: string, refDate: string, monthsAhead = 12): boolean => {
  const ref = new Date(refDate + "T00:00:00");
  const due = new Date(dueDate + "T00:00:00");
  const limit = new Date(ref);
  limit.setMonth(limit.getMonth() + monthsAhead);
  return due <= limit;
};

const isLongTerm = (dueDate: string, refDate: string, monthsAhead = 12): boolean => {
  const ref = new Date(refDate + "T00:00:00");
  const due = new Date(dueDate + "T00:00:00");
  const limit = new Date(ref);
  limit.setMonth(limit.getMonth() + monthsAhead);
  return due > limit;
};

export function calculateBalance(input: BalanceInput): BalanceOutput {
  const { referenceDate, bankAccounts, receivables, payables, manualEntries } = input;

  // === ATIVO CIRCULANTE ===
  const caixaEquivalentes = bankAccounts.reduce(
    (acc, b) => acc + Number(b.balance || 0),
    0
  );

  const contasReceber = receivables
    .filter(
      (r) =>
        (r.status === "pending" || r.status === "overdue") &&
        isWithinShortTerm(r.due_date, referenceDate)
    )
    .reduce((acc, r) => acc + Number(r.amount || 0), 0);

  const ativoCirculanteManual = sumManualByType(manualEntries, "ativo_circulante", referenceDate);
  const ativoCirculante = caixaEquivalentes + contasReceber + ativoCirculanteManual;

  // === ATIVO NÃO CIRCULANTE ===
  // Investimentos pagos (imobilizado adquirido) com paid_at <= refDate
  const investimentosImobilizado = payables
    .filter(
      (p) =>
        p.accounting_type === "investimento" &&
        p.status === "paid" &&
        p.paid_at !== null &&
        p.paid_at <= referenceDate
    )
    .reduce((acc, p) => acc + Number(p.amount || 0), 0);

  const ativoNaoCirculanteManual = sumManualByType(manualEntries, "ativo_nao_circulante", referenceDate);
  const ativoNaoCirculante = investimentosImobilizado + ativoNaoCirculanteManual;

  const ativoTotal = ativoCirculante + ativoNaoCirculante;

  // === PASSIVO CIRCULANTE ===
  const contasPagar = payables
    .filter(
      (p) =>
        (p.status === "pending" || p.status === "overdue") &&
        isWithinShortTerm(p.due_date, referenceDate)
    )
    .reduce((acc, p) => acc + Number(p.amount || 0), 0);

  const passivoCirculanteManual = sumManualByType(manualEntries, "passivo_circulante", referenceDate);
  const passivoCirculante = contasPagar + passivoCirculanteManual;

  // === PASSIVO NÃO CIRCULANTE ===
  // Payables pendentes com vencimento > 12 meses
  const passivoNaoCirculanteAuto = payables
    .filter(
      (p) =>
        (p.status === "pending" || p.status === "overdue") &&
        isLongTerm(p.due_date, referenceDate)
    )
    .reduce((acc, p) => acc + Number(p.amount || 0), 0);

  const passivoNaoCirculanteManual = sumManualByType(manualEntries, "passivo_nao_circulante", referenceDate);
  const passivoNaoCirculante = passivoNaoCirculanteAuto + passivoNaoCirculanteManual;

  const passivoTotal = passivoCirculante + passivoNaoCirculante;

  // === PATRIMÔNIO LÍQUIDO ===
  // Resultado Acumulado = receivables pagos histórico - payables pagos histórico (até refDate)
  const totalRecPagos = receivables
    .filter((r) => r.status === "paid" && r.paid_at !== null && r.paid_at <= referenceDate)
    .reduce((acc, r) => acc + Number(r.amount || 0), 0);

  const totalPayPagos = payables
    .filter((p) => p.status === "paid" && p.paid_at !== null && p.paid_at <= referenceDate)
    .reduce((acc, p) => acc + Number(p.amount || 0), 0);

  const resultadoAcumulado = totalRecPagos - totalPayPagos;
  const patrimonioLiquidoManual = sumManualByType(manualEntries, "patrimonio_liquido", referenceDate);
  const patrimonioLiquido = resultadoAcumulado + patrimonioLiquidoManual;

  // === Equação contábil ===
  const passivoMaisPL = passivoTotal + patrimonioLiquido;
  const diferenca = ativoTotal - passivoMaisPL;
  const equilibrado = Math.abs(diferenca) <= TOLERANCE;

  // === Detalhamento de manuais agrupado ===
  const manualByType: Record<string, BalanceSheetEntryLite[]> = {};
  for (const e of manualEntries) {
    if (e.reference_date > referenceDate) continue;
    if (!manualByType[e.entry_type]) manualByType[e.entry_type] = [];
    manualByType[e.entry_type].push(e);
  }

  return {
    caixaEquivalentes,
    contasReceber,
    ativoCirculanteManual,
    ativoCirculante,
    investimentosImobilizado,
    ativoNaoCirculanteManual,
    ativoNaoCirculante,
    ativoTotal,

    contasPagar,
    passivoCirculanteManual,
    passivoCirculante,
    passivoNaoCirculanteManual,
    passivoNaoCirculante,
    passivoTotal,

    resultadoAcumulado,
    patrimonioLiquidoManual,
    patrimonioLiquido,

    passivoMaisPL,
    diferenca,
    equilibrado,

    manualByType,
  };
}
