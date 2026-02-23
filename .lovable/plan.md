

# Modulo de Business Intelligence (BI) Profissional -- Plataforma AXIS

## Resumo
Implementar um modulo completo de BI com Dashboard Builder, graficos interativos (barras, linhas, pizza, KPI cards), filtros avancados, alertas de KPI e exportacao de dados. O modulo sera integrado ao sistema existente seguindo o padrao de tenant isolation ja utilizado no projeto.

---

## 1. Banco de Dados (Migracao SQL)

Criar as seguintes tabelas adaptadas ao modelo multi-tenant existente (usando `tenant_id` em vez de `workspace_id`):

- **dim_event_types** -- Tipos de eventos para classificacao
- **dim_customers** -- Dimensao de clientes para BI
- **dim_products** -- Dimensao de produtos para BI
- **fact_events** -- Tabela de fatos central (timestamp, tipo, usuario, valor, metadata)
- **bi_dashboards** -- Dashboards criados pelos usuarios
- **bi_widgets** -- Widgets dentro de cada dashboard (tipo, config de query, config de layout)
- **bi_alerts** -- Alertas de KPI (condicao, threshold, widget vinculado)
- **bi_alert_logs** -- Historico de alertas disparados

Todas com RLS habilitado e politicas de tenant isolation. Indices de performance na `fact_events` (timestamp, event_type_id, tenant_id).

Funcao SQL `execute_bi_widget_query` para executar queries dinamicas dos widgets com protecao contra SQL injection.

---

## 2. Edge Function: check-kpi-alerts

Criar `supabase/functions/check-kpi-alerts/index.ts` que:
- Busca todos os alertas ativos
- Executa a query do widget associado via RPC
- Compara o valor atual com o threshold
- Registra log em `bi_alert_logs` quando a condicao e atendida

---

## 3. Componentes React

Criar a seguinte estrutura:

```text
src/components/bi/
  BIDashboard.tsx          -- Componente principal com selecao de dashboard, filtros, modo edicao
  DashboardGrid.tsx        -- Grid responsivo de widgets (sem react-grid-layout, usando CSS grid)
  WidgetWrapper.tsx        -- Wrapper que busca dados via RPC e renderiza o grafico correto
  DashboardFilters.tsx     -- Filtros de periodo e usuario
  WidgetConfigModal.tsx    -- Modal para configurar novo widget (tipo, metrica, dimensao)
  charts/
    BIBarChart.tsx          -- Grafico de barras (recharts)
    BILineChart.tsx         -- Grafico de linhas (recharts)
    BIPieChart.tsx          -- Grafico de pizza (recharts)
    BIKpiCard.tsx           -- Card de KPI com indicador de tendencia
```

Nota: O projeto ja possui `recharts` instalado. Nao sera necessario instalar `react-grid-layout` -- usaremos CSS grid nativo para o layout dos widgets, o que e mais simples e nao requer dependencias extras.

---

## 4. Pagina e Rota

- Criar `src/pages/BusinessIntelligence.tsx` que renderiza o `BIDashboard`
- Adicionar rota `/business-intelligence` em `App.tsx`
- Adicionar item "Business Intelligence" no sidebar (`AppSidebar.tsx`) no grupo adequado

---

## 5. Adaptacoes ao Projeto Existente

O PDF original usa `workspace_id` e `public.users` -- vamos adaptar para:
- Usar `tenant_id` com `get_user_tenant_id()` nas politicas RLS (padrao do projeto)
- Referenciar `auth.uid()` diretamente em vez de `public.users`
- Usar `@tanstack/react-query` (ja instalado) em vez de `react-query`
- Usar componentes UI do projeto (shadcn/ui) em vez de HTML/Tailwind puro
- Usar `supabase` de `@/integrations/supabase/client`

---

## 6. Metricas Monitoradas

O BI vai agregar dados de:
- **ERP**: Fluxo de caixa, contas a pagar vs receber, estoque
- **CRM**: Funil de vendas, taxa de conversao, leads
- **WhatsApp**: Volume de mensagens

---

## Detalhes Tecnicos

### Arquivos Criados
- `supabase/migrations/...` -- Migracao com todas as tabelas, indices, RLS e funcao SQL
- `supabase/functions/check-kpi-alerts/index.ts` -- Edge function de alertas
- `src/components/bi/BIDashboard.tsx`
- `src/components/bi/DashboardGrid.tsx`
- `src/components/bi/WidgetWrapper.tsx`
- `src/components/bi/DashboardFilters.tsx`
- `src/components/bi/WidgetConfigModal.tsx`
- `src/components/bi/charts/BIBarChart.tsx`
- `src/components/bi/charts/BILineChart.tsx`
- `src/components/bi/charts/BIPieChart.tsx`
- `src/components/bi/charts/BIKpiCard.tsx`
- `src/pages/BusinessIntelligence.tsx`

### Arquivos Modificados
- `src/App.tsx` -- Nova rota `/business-intelligence`
- `src/components/AppSidebar.tsx` -- Item de menu "BI" no sidebar

