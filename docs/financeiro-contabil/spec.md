# Especificação: Módulo Financeiro Contábil (DRE, Balanço Patrimonial e Fluxo de Caixa Projetado)

## 1. Visão Geral

- **Nome da Funcionalidade:** Módulo Financeiro Contábil — AXIS CRM
- **Objetivo:** Evoluir o módulo financeiro do AXIS de um controle de fluxo de caixa simples para um sistema com visão contábil gerencial, entregando DRE, Balanço Patrimonial e Fluxo de Caixa Projetado. Permite que o gestor da PME entenda **resultado do período**, **saúde patrimonial** e **projeção de caixa**, sem depender de planilhas externas.
- **Público-Alvo:** Gestores e administradores de tenants no AXIS CRM (PMEs que usam o módulo financeiro para gerir contas a pagar/receber e querem visão contábil gerencial).
- **Repositório:** `axis-axhub` (GitHub: `rodcariaodonto-afk/axis-axhub`)
- **Stack:** React + TS + Vite + Tailwind + shadcn/ui + Supabase (PostgreSQL com RLS multi-tenant)
- **Project ID Supabase:** `dgybxarkvmaajfeesqdv`

## 2. Requisitos Funcionais

### 2.1 Classificação Contábil em Lançamentos
- O sistema deve permitir classificar contábilmente cada conta a pagar (`payables`) com um dos tipos: `custo_operacional`, `despesa_administrativa`, `despesa_comercial`, `despesa_financeira`, `investimento`, `passivo_circulante`, `passivo_nao_circulante`.
- O sistema deve permitir classificar contábilmente cada conta a receber (`receivables`) com um dos tipos: `receita_operacional`, `receita_financeira`, `receita_nao_operacional`, `ativo_circulante`, `ativo_nao_circulante`.
- O sistema deve permitir agrupar lançamentos por um campo livre `accounting_group` (ex: "Pessoal", "Marketing", "Infraestrutura").
- O sistema deve auto-classificar lançamentos legados (existentes na base) via mapeamento por `category` durante a migração.

### 2.2 DRE — Demonstração do Resultado do Exercício
- O sistema deve exibir uma página `/dre` com a estrutura hierárquica padrão de DRE: Receita Bruta → Deduções → Receita Líquida → Custos → Lucro Bruto → Despesas Operacionais → Resultado Operacional → Investimentos → Resultado Líquido.
- O DRE deve filtrar dados por período (mês/ano inicial e final).
- O DRE deve consolidar `receivables` e `payables` com `status = 'paid'` no período, agrupados por `accounting_type`.
- O DRE deve exibir cards de KPI: Receita Bruta, Lucro Bruto, Margem Bruta %, Resultado Líquido.
- O DRE deve exibir gráfico de barras (Recharts) com Receitas vs Despesas por mês.
- O DRE deve permitir exportar o relatório em CSV.

### 2.3 Balanço Patrimonial
- O sistema deve exibir uma página `/balanco-patrimonial` com 2 abas: "Calculado Automaticamente" e "Lançamentos Manuais".
- A aba "Calculado Automaticamente" deve consolidar:
  - **Ativo Circulante:** soma de `bank_accounts.balance` + `receivables` pendentes com `accounting_type = 'ativo_circulante'`.
  - **Ativo Não Circulante:** `payables` pagos com `accounting_type = 'investimento'` + lançamentos manuais do tipo `ativo_nao_circulante`.
  - **Passivo Circulante:** `payables` pendentes com `accounting_type = 'passivo_circulante'` + lançamentos manuais.
  - **Passivo Não Circulante:** `payables` pendentes com `accounting_type = 'passivo_nao_circulante'` + lançamentos manuais.
  - **Patrimônio Líquido:** `(receivables pagos histórico) - (payables pagos histórico)` + ajustes manuais (capital social, reservas, lucros distribuídos) registrados em `balance_sheet_entries` com `entry_type = 'patrimonio_liquido'`.
- A aba "Lançamentos Manuais" deve permitir CRUD de `balance_sheet_entries` (data, tipo, nome da conta, código, valor, observações, source).
- A página deve exibir indicador visual da equação `ATIVO = PASSIVO + PL` (verde se equilibrado, vermelho se divergente, com tolerância de R$ 0,01).

### 2.4 Fluxo de Caixa Projetado
- O sistema deve adicionar uma nova aba "Fluxo Projetado" em `/finance` (sem remover as abas existentes "Visão Geral" e "Categorias").
- A aba deve permitir cadastrar projeções mensais (`cash_flow_projections`) com: mês de referência, tipo (entrada/saída), categoria, descrição, valor projetado, recorrente.
- A aba deve exibir tabela mensal comparando: Entradas Projetadas vs Realizadas, Saídas Projetadas vs Realizadas, Saldo Projetado vs Realizado.
- A aba deve exibir gráfico de linha (Recharts) com Projetado vs Realizado.
- A aba deve permitir CRUD completo de projeções.

### 2.5 Integração com BI e Reports
- O sistema deve adicionar 8 novas métricas contábeis nos widgets do BI: `dre_receita_bruta`, `dre_lucro_bruto`, `dre_resultado_liquido`, `dre_margem_bruta`, `balanco_ativo_total`, `balanco_passivo_total`, `balanco_patrimonio_liquido`, `fluxo_projetado_mes`.
- O sistema deve adicionar 2 novos templates de Reports: `dre-detalhado` e `balanco-resumo`.

### 2.6 Navegação
- O menu lateral deve incluir 2 novos itens no grupo "Financeiro": "DRE" (`/dre`) e "Balanço Patrimonial" (`/balanco-patrimonial`).
- As novas rotas devem usar `lazy()` import com `ProtectedRoute`.

## 3. Regras de Negócio

### 3.1 Auto-classificação de Lançamentos Legados
- Durante a migração, todo `payable` ou `receivable` existente sem `accounting_type` deve ser classificado automaticamente via mapeamento por `category` (lowercase, com fallback para NULL).
- **Mapa de Payables (categoria → accounting_type):**
  - `salário`, `salarios`, `folha de pagamento`, `pessoal`, `rh`, `aluguel`, `condomínio`, `condominio`, `energia`, `água`, `agua`, `internet`, `telefone`, `contabilidade`, `escritório`, `escritorio`, `material de escritório` → `despesa_administrativa`
  - `marketing`, `publicidade`, `tráfego`, `trafego`, `comissão`, `comissao`, `comissões`, `comissoes`, `vendas` → `despesa_comercial`
  - `juros`, `tarifa bancária`, `tarifa bancaria`, `taxa bancária`, `taxa bancaria`, `iof`, `multa` → `despesa_financeira`
  - `equipamento`, `móveis`, `moveis`, `imobilizado`, `software`, `licença`, `licenca` → `investimento`
  - `fornecedor`, `mercadoria`, `matéria-prima`, `materia-prima`, `cmv`, `produção`, `producao`, `insumo` → `custo_operacional`
  - `empréstimo`, `emprestimo`, `financiamento` → `passivo_nao_circulante`
  - Demais categorias → permanece `NULL` (exibido como "Não Classificado" no DRE até revisão manual)
- **Mapa de Receivables:**
  - `venda`, `vendas`, `serviço`, `servico`, `serviços`, `servicos`, `mensalidade`, `assinatura`, `produto`, `cliente` → `receita_operacional`
  - `juros recebidos`, `rendimento`, `aplicação`, `aplicacao` → `receita_financeira`
  - `venda de ativo`, `eventual`, `outros` → `receita_nao_operacional`
  - Demais → permanece `NULL`

### 3.2 Cálculo de DRE
- Período padrão: mês corrente (do dia 1 até hoje).
- Receita Bruta = Σ `receivables.amount` onde `status = 'paid'` AND `paid_at` no período AND `accounting_type IN ('receita_operacional', 'receita_nao_operacional')`.
- CMV = Σ `payables.amount` onde `accounting_type = 'custo_operacional'` no período (`paid_at`).
- Lucro Bruto = Receita Líquida − CMV. (Receita Líquida = Receita Bruta − Deduções; v1 sem campo manual de deduções → Receita Líquida = Receita Bruta).
- Despesas Operacionais = Σ `payables.amount` onde `accounting_type IN ('despesa_administrativa', 'despesa_comercial', 'despesa_financeira')`.
- Resultado Operacional = Lucro Bruto − Despesas Operacionais.
- Resultado Líquido = Resultado Operacional − Investimentos (`accounting_type = 'investimento'`).
- Margem Bruta % = (Lucro Bruto / Receita Bruta) × 100. Se Receita Bruta = 0, exibir "—".
- Lançamentos com `accounting_type = NULL` aparecem em linha "Não Classificado" abaixo da estrutura padrão (não somam ao Resultado Líquido), com botão "Revisar Classificação" que linka para `/payables` e `/receivables` filtrado.

### 3.3 Cálculo de Balanço Patrimonial
- Data de referência: dia atual (configurável).
- **Ativo Circulante automático:**
  - Caixa = Σ `bank_accounts.balance` (apenas contas ativas).
  - Contas a Receber = Σ `receivables.amount` onde `status IN ('pending', 'overdue')` AND `due_date <= reference_date + 365 dias`.
  - Outros ativos circulantes manuais.
- **Ativo Não Circulante:** Σ `payables.amount` onde `accounting_type = 'investimento'` AND `status = 'paid'` AND `paid_at <= reference_date` + lançamentos manuais.
- **Passivo Circulante:** Σ `payables.amount` onde `status IN ('pending', 'overdue')` AND `due_date <= reference_date + 365 dias` + lançamentos manuais.
- **Passivo Não Circulante:** lançamentos manuais com `entry_type = 'passivo_nao_circulante'` (v1 não inferimos por dívida de longo prazo automaticamente).
- **Patrimônio Líquido (híbrido):**
  - Resultado Acumulado Calculado = Σ `receivables` pagos histórico − Σ `payables` pagos histórico (toda a história até `reference_date`).
  - Ajustes Manuais = Σ `balance_sheet_entries` com `entry_type = 'patrimonio_liquido'` AND `reference_date <= filtro` (capital social entra positivo, lucros distribuídos entram negativos via valor negativo).
  - PL Total = Resultado Acumulado + Ajustes Manuais.
- **Equação Contábil:** verificar `|TOTAL ATIVO − (TOTAL PASSIVO + PL)| ≤ 0.01`. Se OK → badge verde "Equilibrado". Se não → badge vermelho "Divergência: R$ X,XX" com tooltip explicando que ajustes manuais podem corrigir.

### 3.4 Fluxo de Caixa Projetado
- Projeções são lançamentos manuais não vinculados a `payables`/`receivables` reais.
- Saldo Projetado do mês = Σ entradas projetadas − Σ saídas projetadas.
- Saldo Realizado do mês = Σ `receivables` pagos no mês − Σ `payables` pagos no mês.
- Variação % = (Realizado − Projetado) / Projetado × 100. Se Projetado = 0, exibir "—".
- Recorrência (`is_recurring = true`) **não cria** registros automáticos na v1 — é apenas um marcador visual. A automação fica para v2.

### 3.5 Multi-tenant e Segurança
- Todas as novas tabelas (`balance_sheet_entries`, `cash_flow_projections`) devem ter coluna `tenant_id UUID NOT NULL REFERENCES tenants(id)`.
- RLS deve usar a função `get_user_tenant_id()` (padrão estabelecido nas migrations existentes — confirmado em `20260221042737_*.sql` e `20260222230734_*.sql`).
- Triggers `updated_at` devem usar a função `update_updated_at_column()` (confirmada em `20260221044729_*.sql`).
- Frontend deve filtrar explicitamente por `tenant_id` quando possível (defesa em profundidade).

## 4. Requisitos Não Funcionais

- **Performance:**
  - Queries de DRE e Balanço devem retornar em < 800ms para datasets de até 10k lançamentos.
  - Usar índices em `(tenant_id, accounting_type, paid_at)` em `payables` e `receivables` (criados na migration).
- **Segurança:** RLS ativa em todas as novas tabelas; validação de JWT em qualquer Edge Function (não há Edge Functions previstas para v1, tudo via cliente Supabase).
- **Compatibilidade:** **Aditivo apenas.** Não remover/renomear colunas, tabelas, componentes ou rotas existentes. Todas as novas colunas com `DEFAULT NULL`.
- **Acessibilidade:** Componentes shadcn/ui já garantem ARIA básico. Badges coloridos devem ter texto descritivo (não depender só de cor).
- **Responsividade:** Cards KPI em grid `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`. Tabelas com scroll horizontal em mobile.
- **i18n:** Tudo em pt-BR. Moeda formatada como `R$ X.XXX,XX` via função `fmt` existente.

## 5. Casos Extremos e Tratamento de Erros

| Cenário | Ação Esperada |
|---|---|
| DRE sem nenhum lançamento no período | Exibir empty state com texto "Nenhum lançamento pago no período. Classifique seus contas a pagar/receber para gerar o DRE." + CTA para `/payables` |
| Margem Bruta com Receita Bruta = 0 | Exibir "—" ao invés de divisão por zero |
| Balanço com equação desequilibrada | Badge vermelho com diferença em R$ + tooltip "Para equilibrar, use a aba Lançamentos Manuais para registrar Capital Social, Reservas, ou ajustes contábeis" |
| `accounting_type` NULL em lançamento existente | Auto-classificar via mapa de categorias na migration. Se a categoria não estiver no mapa, fica NULL e aparece como "Não Classificado" no DRE |
| Lançamento sem `paid_at` mas com `status = 'paid'` | Considerar `updated_at` como fallback. Logar warning no console |
| Projeção com mês passado | Permitir cadastro (útil para registrar projeções históricas em retrospectivas), mas exibir badge "Vencida" |
| Usuário sem permissão `financeiro` | Itens do menu não aparecem (sistema de módulos existente já trata) |
| Erro de rede no fetch | Toast de erro via `useToast()` + fallback para empty state com botão "Tentar novamente" |
| `bank_accounts.balance` retorna NULL | Tratar como 0 (`Number(b.balance ?? 0)`) |
| Conflito de tenant_id em lançamento manual | RLS bloqueia. Frontend nem precisa verificar. Toast genérico se erro |

## 6. Integrações e Interfaces

### 6.1 Banco de Dados
- **Tabelas alteradas:**
  - `payables`: `+ accounting_type TEXT CHECK(...) DEFAULT NULL`, `+ accounting_group TEXT DEFAULT NULL`
  - `receivables`: `+ accounting_type TEXT CHECK(...) DEFAULT NULL`, `+ accounting_group TEXT DEFAULT NULL`
- **Tabelas novas:**
  - `balance_sheet_entries` (8 colunas + RLS + trigger)
  - `cash_flow_projections` (10 colunas + RLS + trigger)
- **Índices novos:**
  - `idx_payables_tenant_accounting` ON `payables(tenant_id, accounting_type, paid_at)`
  - `idx_receivables_tenant_accounting` ON `receivables(tenant_id, accounting_type, paid_at)`
  - `idx_bse_tenant_date` ON `balance_sheet_entries(tenant_id, reference_date)`
  - `idx_cfp_tenant_month` ON `cash_flow_projections(tenant_id, reference_month)`

### 6.2 Frontend (React)
- **Páginas novas:** `src/pages/DRE.tsx`, `src/pages/BalancoPatrimonial.tsx`
- **Páginas modificadas:** `src/pages/Payables.tsx`, `src/pages/Receivables.tsx`, `src/pages/Finance.tsx`
- **Componentes modificados:**
  - `src/components/AppSidebar.tsx` — menu lateral
  - `src/App.tsx` — rotas lazy
  - `src/components/bi/WidgetConfigModal.tsx` — métricas contábeis
  - `src/components/bi/DashboardGrid.tsx` (ou `WidgetWrapper.tsx`) — handlers das métricas
  - `src/components/reports/reportTemplates.ts` — 2 novos templates
  - `src/components/reports/reportDataGenerators.ts` — 2 novos generators

### 6.3 Bibliotecas (já instaladas, não adicionar novas)
- `@tanstack/react-query` v5 — fetch e cache
- `recharts` — gráficos
- `lucide-react` — ícones (`FileBarChart2`, `Scale`, `TrendingUp`, `TrendingDown`)
- `react-hook-form` + `zod` — formulários (se necessário)

## 7. Critérios de Aceite (BDD)

### 7.1 Schema e Auto-classificação
- **Dado que** existem 50 `payables` e 30 `receivables` legados sem `accounting_type`, **quando** a migration é aplicada, **então** ao menos 70% dos lançamentos devem receber classificação automática baseada em `category` (verificável via SELECT COUNT WHERE accounting_type IS NOT NULL).
- **Dado que** sou um usuário do tenant A, **quando** consulto `balance_sheet_entries`, **então** não vejo registros do tenant B (RLS).

### 7.2 Formulários Payables/Receivables
- **Dado que** estou criando uma nova conta a pagar, **quando** seleciono "Despesa Administrativa" no campo Classificação Contábil, **então** o registro é salvo com `accounting_type = 'despesa_administrativa'`.
- **Dado que** estou listando contas a pagar, **quando** abro a página, **então** vejo a coluna "Classif. Contábil" com badge colorido (amarelo=custo, vermelho=despesa, azul=investimento, cinza=passivo).
- **Dado que** edito uma conta sem alterar a classificação contábil, **quando** salvo, **então** o `accounting_type` permanece inalterado (não vira NULL).

### 7.3 DRE
- **Dado que** tenho R$ 10.000 de receita_operacional paga e R$ 4.000 de custo_operacional pago em janeiro/2026, **quando** abro DRE filtrando jan/2026, **então** vejo Receita Bruta = R$ 10.000, CMV = R$ 4.000, Lucro Bruto = R$ 6.000, Margem Bruta = 60%.
- **Dado que** tenho 5 payables sem `accounting_type` no período, **quando** abro DRE, **então** vejo linha "Não Classificado" com a soma deles, sem afetar o Resultado Líquido oficial.
- **Dado que** o DRE está renderizado, **quando** clico em "Exportar CSV", **então** o arquivo `dre_YYYY-MM_a_YYYY-MM.csv` é baixado com as linhas hierárquicas.

### 7.4 Balanço Patrimonial
- **Dado que** tenho R$ 5.000 em `bank_accounts`, R$ 3.000 em receivables pendentes, R$ 2.000 em payables pendentes, e R$ 0 em PL manual, **quando** abro Balanço, **então** Ativo Total = R$ 8.000, Passivo Total = R$ 2.000, PL Calculado = R$ 6.000, equação equilibrada (Ativo = Passivo + PL = 8.000).
- **Dado que** registro um lançamento manual de Capital Social = R$ 10.000 em PL, **quando** recarrego o Balanço, **então** PL Total = R$ 6.000 + R$ 10.000 = R$ 16.000 e a equação fica desequilibrada em R$ 10.000 (porque Ativo não foi ajustado — esperado, mostrar a divergência).
- **Dado que** crio um lançamento manual em ABA Manual, **quando** recarrego, **então** o lançamento aparece na listagem e pode ser editado/excluído.

### 7.5 Fluxo Projetado
- **Dado que** cadastro projeção de R$ 5.000 entrada em mar/2026 e tenho R$ 4.500 realizado, **quando** abro a aba, **então** vejo coluna Projetado=5000, Realizado=4500, Variação=-10%.
- **Dado que** não há projeções cadastradas, **quando** abro a aba, **então** vejo empty state com CTA "Adicionar Projeção".

### 7.6 Navegação e Build
- **Dado que** estou logado, **quando** abro o menu lateral, **então** vejo "DRE" e "Balanço Patrimonial" no grupo Financeiro.
- **Dado que** a implementação foi concluída, **quando** rodo `npm run build` (não `pnpm build` — projeto usa npm), **então** o build completa sem erros TypeScript.
- **Dado que** abro qualquer página existente (Leads, Pipeline, etc.), **quando** navego, **então** nenhuma funcionalidade existente foi quebrada (regressão zero).

## 8. Decisões de Produto Travadas

| Decisão | Escolha | Justificativa |
|---|---|---|
| Lançamentos sem classificação | Auto-classificação por mapa de categorias na migration | Reduz dor do usuário; lançamentos não mapeados ficam visíveis como "Não Classificado" para revisão |
| Patrimônio Líquido | Híbrido: cálculo automático (resultado acumulado) + ajustes manuais (capital social, reservas) | Realismo contábil sem exigir conhecimento avançado do usuário |
| Estratégia de execução | 5 slices granulares | Maior segurança em commits; permite parar e validar entre slices |
| Recorrência em projeções | v1: marcador visual apenas; v2: criação automática de registros | Reduz escopo e risco da v1 |
| Deduções da Receita no DRE | v1: campo automático = 0 (não há tabela de impostos); v2: campo manual ou tabela de impostos | DRE simplificado é suficiente para visão gerencial PME |
| Package manager | `npm` (confirmado via `package-lock.json`) | Realidade do projeto, não `pnpm` como o PDF original sugere |

## 9. Fora de Escopo (v1)

- Geração automática de lançamentos recorrentes a partir de `cash_flow_projections`
- Importação de XML/PDF de contadores (campo `source` está pronto, mas UI fica para v2)
- Tabela de impostos sobre vendas (Deduções da Receita)
- DFC (Demonstração do Fluxo de Caixa) pelo método indireto
- Comparação YoY (Year-over-Year) no DRE
- Aprovação/workflow de lançamentos contábeis
- Conciliação bancária automática
