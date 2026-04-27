# Tarefas: Módulo Financeiro Contábil

> Cada task é atômica (1 sessão). Se ficar grande, quebrar mais.

## Slice 1 — Schema + Auto-classificação ⭐

- [ ] **1.1** Criar branch `feature/finance-contabil-schema` e fazer backup do banco (export do Supabase via Lovable, se disponível)
- [ ] **1.2** Criar migration SQL `<timestamp>_financial_accounting_module.sql` com: ALTER `payables`, ALTER `receivables`, CREATE `balance_sheet_entries`, CREATE `cash_flow_projections`, RLS, triggers, índices
- [ ] **1.3** Adicionar UPDATE de auto-classificação na mesma migration (mapas por `category` para `payables` e `receivables`)
- [ ] **1.4** Rodar a migration no Editor SQL do Lovable (Banco de Dados → Editor SQL)
- [ ] **1.5** Validar com SELECTs: distribuição de `accounting_type`, RLS funcionando, lançamentos sem classificação
- [ ] **1.6** Commit + push + PR + merge + publicar no Lovable

**Critério de saída:** ≥ 70% dos lançamentos legados com `accounting_type` preenchido.

---

## Slice 2 — Formulários Payables/Receivables

- [ ] **2.1** Criar branch `feature/finance-contabil-forms`
- [ ] **2.2** Criar `src/types/financial.ts` com tipos `AccountingTypePayable`, `AccountingTypeReceivable`, etc.
- [ ] **2.3** Criar `src/components/financial/AccountingTypeSelect.tsx` (props: `kind: 'payable' | 'receivable'`, `value`, `onChange`)
- [ ] **2.4** Criar `src/components/financial/AccountingTypeBadge.tsx` (props: `type`, `kind`)
- [ ] **2.5** Modificar `src/pages/Payables.tsx`: adicionar 2 campos no form, atualizar insert/update, adicionar coluna na tabela
- [ ] **2.6** Modificar `src/pages/Receivables.tsx`: idem
- [ ] **2.7** Smoke test: criar 1 payable e 1 receivable com classificação; editar sem alterar; validar persistência
- [ ] **2.8** `npm run build` sem erros
- [ ] **2.9** Commit + push + PR + merge + publicar

---

## Slice 3 — DRE

- [ ] **3.1** Criar branch `feature/finance-contabil-dre`
- [ ] **3.2** Criar `src/lib/financial/dreCalculator.ts` com função pura `calculateDRE(input): DREOutput`
- [ ] **3.3** Criar `src/pages/DRE.tsx`: filtros, fetch via React Query, KPIs, tabela hierárquica, gráfico (Recharts BarChart), botão CSV
- [ ] **3.4** Adicionar rota lazy em `src/App.tsx`: `/dre`
- [ ] **3.5** Adicionar item "DRE" no `src/components/AppSidebar.tsx` grupo Financeiro
- [ ] **3.6** Smoke test: abrir `/dre`, filtrar mês corrente, verificar valores batem com soma manual de payables/receivables
- [ ] **3.7** Validar export CSV (abrir no Excel/Numbers)
- [ ] **3.8** `npm run build` sem erros
- [ ] **3.9** Commit + push + PR + merge + publicar

---

## Slice 4 — Balanço Patrimonial

- [ ] **4.1** Criar branch `feature/finance-contabil-balanco`
- [ ] **4.2** Criar `src/lib/financial/balanceCalculator.ts` com função pura `calculateBalance(input): BalanceSheetOutput`
- [ ] **4.3** Criar `src/components/financial/BalanceSheetEntryDialog.tsx` (CRUD)
- [ ] **4.4** Criar `src/pages/BalancoPatrimonial.tsx`: 2 abas (Tabs), seletor de data, equação contábil com indicador
- [ ] **4.5** Adicionar rota lazy em `src/App.tsx`: `/balanco-patrimonial`
- [ ] **4.6** Adicionar item "Balanço Patrimonial" no `AppSidebar.tsx`
- [ ] **4.7** Smoke test: abrir, criar lançamento manual de Capital Social, verificar PL atualiza
- [ ] **4.8** `npm run build` sem erros
- [ ] **4.9** Commit + push + PR + merge + publicar

---

## Slice 5 — Fluxo Projetado + BI + Reports

- [ ] **5.1** Criar branch `feature/finance-contabil-projecao-bi`
- [ ] **5.2** Criar `src/components/financial/ProjectionDialog.tsx` (CRUD `cash_flow_projections`)
- [ ] **5.3** Modificar `src/pages/Finance.tsx`: adicionar `<TabsTrigger value="projetado">` e conteúdo da aba
- [ ] **5.4** Modificar `src/components/bi/WidgetConfigModal.tsx`: adicionar grupo "Financeiro Contábil" no select
- [ ] **5.5** Modificar `src/components/bi/DashboardGrid.tsx` (ou `WidgetWrapper.tsx`): adicionar 8 handlers de métricas
- [ ] **5.6** Modificar `src/components/reports/reportTemplates.ts`: adicionar 2 templates
- [ ] **5.7** Modificar `src/components/reports/reportDataGenerators.ts`: adicionar 2 generators
- [ ] **5.8** Smoke test integrado: criar projeção, ver na tabela; criar widget BI com `dre_resultado_liquido`; gerar report `dre-detalhado`
- [ ] **5.9** Regressão: abrir `/finance` aba "Visão Geral" e "Categorias" — devem continuar funcionando
- [ ] **5.10** `npm run build` sem erros
- [ ] **5.11** Commit + push + PR + merge + publicar

---

## Tarefas Globais (após todos os slices)

- [ ] **G.1** Documentar features em `docs/financeiro-contabil/README.md` (visão de usuário)
- [ ] **G.2** Adicionar entry no CHANGELOG do projeto (se existir)
- [ ] **G.3** Smoke test completo: percorrer todas as 5 telas do módulo + BI + Reports
- [ ] **G.4** Atualizar memória de longo prazo do projeto (resumo técnico AXIS)
