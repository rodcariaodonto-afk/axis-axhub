# Plano Técnico: Módulo Financeiro Contábil — AXIS CRM

> Referência: `spec.md` (mesmo diretório). Toda decisão técnica aqui deriva da spec.

## 1. Arquitetura

### 1.1 Visão Geral
```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend                          │
│                                                             │
│  /payables ──┐                                              │
│  /receivables ┼──> [accounting_type, accounting_group]      │
│              │                                              │
│  /dre ───────┴──┐                                           │
│  /balanco-patrimonial ┼──> Supabase Client (RLS)            │
│  /finance (aba Projetado) ┘                                 │
│                                                             │
│  /bi (widgets) ──> 8 novas métricas contábeis              │
│  /reports ──> 2 novos templates                             │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│           Supabase (PostgreSQL + RLS)                       │
│                                                             │
│  payables (+ accounting_type, accounting_group)             │
│  receivables (+ accounting_type, accounting_group)          │
│  balance_sheet_entries (NOVA)                               │
│  cash_flow_projections (NOVA)                               │
│                                                             │
│  Funções existentes: get_user_tenant_id(),                  │
│                      update_updated_at_column()             │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Frontend (React + TypeScript + Lovable)

**Componentes Novos**
- `src/pages/DRE.tsx` — página completa de DRE (filtros, tabela hierárquica, KPIs, gráfico, export CSV)
- `src/pages/BalancoPatrimonial.tsx` — página com 2 abas (calculado + manual)
- `src/components/financial/AccountingTypeSelect.tsx` — Select reutilizável para `accounting_type` (versões "payable" e "receivable")
- `src/components/financial/AccountingTypeBadge.tsx` — badge colorido para listagens
- `src/components/financial/ProjectionDialog.tsx` — Dialog de cadastro/edição de `cash_flow_projections`
- `src/components/financial/BalanceSheetEntryDialog.tsx` — Dialog de cadastro/edição de `balance_sheet_entries`
- `src/lib/financial/dreCalculator.ts` — funções puras de cálculo do DRE (receita bruta, lucro bruto, etc.)
- `src/lib/financial/balanceCalculator.ts` — funções puras de cálculo do Balanço

**Componentes Modificados**
- `src/pages/Payables.tsx` — adicionar 2 campos no form + coluna na tabela
- `src/pages/Receivables.tsx` — adicionar 2 campos no form + coluna na tabela
- `src/pages/Finance.tsx` — adicionar aba "Fluxo Projetado"
- `src/components/AppSidebar.tsx` — adicionar 2 itens no grupo Financeiro
- `src/App.tsx` — adicionar 2 rotas lazy + ProtectedRoute
- `src/components/bi/WidgetConfigModal.tsx` — adicionar grupo "Financeiro Contábil" no select de métricas
- `src/components/bi/DashboardGrid.tsx` ou `WidgetWrapper.tsx` — adicionar handlers das 8 métricas
- `src/components/reports/reportTemplates.ts` — adicionar 2 templates
- `src/components/reports/reportDataGenerators.ts` — adicionar 2 generators

**Tipos (TypeScript)**
- `src/types/financial.ts` — exportar:
  - `AccountingTypePayable`, `AccountingTypeReceivable`
  - `BalanceSheetEntry`, `BalanceSheetEntryType`
  - `CashFlowProjection`
  - `DREResult`, `BalanceSheetResult`

### 1.3 Backend (Supabase)

**Migration única** (Slice 1):
- Arquivo: `supabase/migrations/<timestamp>_financial_accounting_module.sql`
- Conteúdo:
  1. ALTER TABLE em `payables` (2 colunas)
  2. ALTER TABLE em `receivables` (2 colunas)
  3. CREATE TABLE `balance_sheet_entries` + RLS + trigger
  4. CREATE TABLE `cash_flow_projections` + RLS + trigger
  5. CREATE INDEX (4 índices)
  6. UPDATE de auto-classificação para `payables` e `receivables` legados (CASE WHEN com `lower(category)`)

**RLS Policies** (padrão idêntico às migrations existentes):
```sql
CREATE POLICY "tenant_isolation_<table>" ON <table>
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_insert_<table>" ON <table>
  FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_update_<table>" ON <table>
  FOR UPDATE USING (tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_delete_<table>" ON <table>
  FOR DELETE USING (tenant_id = get_user_tenant_id());
```

**Triggers `updated_at`** — usar `update_updated_at_column()` já existente.

### 1.4 Integrações Externas
Nenhuma. Toda lógica é local (frontend + Supabase). Sem Edge Functions, sem APIs externas.

## 2. Fluxo de Implementação (5 Slices)

### Slice 1 — Schema + Auto-classificação ⭐ (atual)
**Objetivo:** Banco pronto, dados legados classificados.
**Saída esperada:** Migration aplicada no Supabase via Editor SQL do Lovable. Auto-classificação roda 1x.
**Arquivos:** 1 arquivo SQL.
**Branch:** `feature/finance-contabil-schema`
**Validação:** SELECT COUNT(*) por accounting_type para conferir distribuição.

### Slice 2 — Formulários Payables/Receivables
**Objetivo:** Usuário consegue classificar lançamentos.
**Saída esperada:** Forms com 2 campos novos, coluna na tabela com badge.
**Arquivos:**
- `src/types/financial.ts` (novo)
- `src/components/financial/AccountingTypeSelect.tsx` (novo)
- `src/components/financial/AccountingTypeBadge.tsx` (novo)
- `src/pages/Payables.tsx` (modificado)
- `src/pages/Receivables.tsx` (modificado)
**Branch:** `feature/finance-contabil-forms`

### Slice 3 — DRE
**Objetivo:** Página `/dre` funcional.
**Arquivos:**
- `src/lib/financial/dreCalculator.ts` (novo)
- `src/pages/DRE.tsx` (novo)
- `src/App.tsx` (rota)
- `src/components/AppSidebar.tsx` (menu)
**Branch:** `feature/finance-contabil-dre`

### Slice 4 — Balanço Patrimonial
**Objetivo:** Página `/balanco-patrimonial` funcional com 2 abas.
**Arquivos:**
- `src/lib/financial/balanceCalculator.ts` (novo)
- `src/components/financial/BalanceSheetEntryDialog.tsx` (novo)
- `src/pages/BalancoPatrimonial.tsx` (novo)
- `src/App.tsx` (rota)
- `src/components/AppSidebar.tsx` (menu)
**Branch:** `feature/finance-contabil-balanco`

### Slice 5 — Fluxo Projetado + BI + Reports
**Objetivo:** Aba Projetado em `/finance`, métricas BI, templates Reports.
**Arquivos:**
- `src/components/financial/ProjectionDialog.tsx` (novo)
- `src/pages/Finance.tsx` (modificado, nova aba)
- `src/components/bi/WidgetConfigModal.tsx` (modificado)
- `src/components/bi/DashboardGrid.tsx` ou `WidgetWrapper.tsx` (modificado)
- `src/components/reports/reportTemplates.ts` (modificado)
- `src/components/reports/reportDataGenerators.ts` (modificado)
**Branch:** `feature/finance-contabil-projecao-bi`

## 3. Padrões de Código

### 3.1 Queries Supabase
```ts
// SEMPRE filtrar tenant_id explicitamente (defesa em profundidade)
const { data: tenant } = await supabase
  .from('profiles')
  .select('tenant_id')
  .eq('id', user.id)
  .single();

const { data, error } = await supabase
  .from('payables')
  .select('amount, accounting_type, paid_at')
  .eq('tenant_id', tenant.tenant_id)
  .eq('status', 'paid')
  .gte('paid_at', dateFrom)
  .lte('paid_at', dateTo);
```

### 3.2 Funções de cálculo (puras)
```ts
// src/lib/financial/dreCalculator.ts
export interface DREInput {
  receivables: Array<{ amount: number; accounting_type: string | null }>;
  payables: Array<{ amount: number; accounting_type: string | null }>;
}

export interface DREOutput {
  receitaBruta: number;
  cmv: number;
  lucroBruto: number;
  margemBruta: number | null; // null se receitaBruta === 0
  // ...
}

export function calculateDRE(input: DREInput): DREOutput {
  // pura, sem efeitos colaterais — testável
}
```

### 3.3 React Query
```ts
const { data, isLoading, error } = useQuery({
  queryKey: ['dre', tenantId, dateFrom, dateTo],
  queryFn: () => fetchDREData({ tenantId, dateFrom, dateTo }),
  staleTime: 5 * 60 * 1000, // 5min
});
```

### 3.4 Componentes shadcn/ui — usar exatamente os já presentes
`Card`, `Table`, `Badge`, `Button`, `Dialog`, `Select`, `Input`, `Label`, `Tabs`, `Tooltip`, `Skeleton`, `Toast (useToast)`.

## 4. Critérios de Saída por Slice

Cada slice só é considerado "concluído" quando:
1. ✅ `npm run build` roda sem erros TypeScript
2. ✅ `git status` está limpo (commit feito)
3. ✅ PR aberto no GitHub
4. ✅ Merge na main após review
5. ✅ Publicação no Lovable
6. ✅ Smoke test manual: abrir a tela e fazer 1 ação básica
7. ✅ Critérios BDD do Slice (subset da Seção 7 do spec) validados

## 5. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Migration falha por categoria com caracteres especiais (ex: aspas) | Baixa | Alto | Testar em staging primeiro; usar `lower()` + `unaccent()` se função existir |
| Cálculo de PL contábilmente "errado" gera dúvida do usuário | Média | Médio | Adicionar tooltip explicando "Resultado acumulado calculado a partir de movimentação" + permitir ajustes manuais |
| Performance ruim no DRE com 50k+ lançamentos | Média | Médio | Índices criados na migration; agregação no Supabase (não no frontend) em v2 se necessário |
| Auto-classificação errada para algumas categorias específicas do tenant | Alta | Baixo | Lançamento fica como "Não Classificado" e usuário revisa manualmente |
| Quebra de funcionalidade existente (Payables/Receivables) | Baixa | Crítico | Aditivo apenas; testar form de criação e edição antes de merge |
| Edge Functions do Lovable não atualizam após push | Média | Alto | Não aplicável a este módulo (não há Edge Functions). Mas se surgir, pedir redeploy manual |

## 6. Checklist de Pré-Execução

- [x] `get_user_tenant_id()` confirmada (presente em migrations)
- [x] `update_updated_at_column()` confirmada (presente em migrations)
- [x] Package manager: `npm` (confirmado via `package-lock.json`)
- [ ] Backup do banco antes da migration (recomendado — ver Slice 1)
- [ ] Branch criada: `git checkout -b feature/finance-contabil-schema`
- [ ] Spec lida e aprovada por Rodrigo
