

# Implementar Report Builder Visual (Nivel Salesforce)

## O Que Existe Hoje vs. O Que o Documento Pede

### Tabela `reports` - Colunas Faltando

| Coluna PDF | Existe? |
|---|---|
| name | Existe |
| description | Existe |
| config (JSONB) | Existe |
| tenant_id | Existe |
| created_by | Existe |
| report_type (table/chart/summary) | **Falta** |
| object_name (accounts/contacts/...) | **Falta** |
| is_active | **Falta** |
| is_favorite | **Falta** |
| last_run_at | **Falta** |

### Sistema Atual vs. Documento

| Item | Atual | Documento |
|---|---|---|
| Abordagem | Templates fixos com queries hardcoded | Builder visual dinamico com campos/filtros/groupBy configuravel |
| Pagina de listagem | Tabs: Templates + Meus Relatorios | Cards com filtros por objeto/tipo + favoritos + busca |
| Builder | Seleciona template, configura date range/group_by, gera | Painel esquerdo (campos, filtros, agrupamento, ordenacao, visualizacao) + preview ao vivo |
| Execucao | Query hardcoded por template | Query dinamica baseada em object_name + config |
| Favoritos | Nao existe | Toggle favorito por relatorio |
| Duplicar | Nao existe | Duplicar relatorio com "(Copia)" |

### Funcionalidades UI Faltando

| Funcionalidade | Status |
|---|---|
| Modal "Novo Relatorio" (nome, descricao, objeto, tipo) | **Falta** |
| Builder visual com painel esquerdo configuravel | **Falta** |
| Secao Campos (checkboxes + drag-and-drop) | **Falta** |
| Secao Filtros (campo + operador + valor) | **Falta** |
| Secao Agrupamento | **Falta** |
| Secao Ordenacao | **Falta** |
| Secao Visualizacao (table/chart/summary) | **Falta** |
| Preview em tempo real na area principal | **Falta** |
| Pagina de Visualizacao do relatorio salvo | **Falta** |
| Filtros em tempo de execucao (runtime filters) | **Falta** |
| Favoritos (toggle) | **Falta** |
| Duplicar relatorio | **Falta** |
| Busca e filtros na listagem | **Falta** |
| Resumo lateral (total por objeto/tipo) | **Falta** |

---

## Plano de Implementacao

### Fase 1: Migracao de Banco

**1.1 Adicionar colunas a `reports`:**
- `report_type` (VARCHAR 50, default 'table') -- table, chart, summary
- `object_name` (VARCHAR 100, nullable) -- accounts, contacts, opportunities, contracts, activities, leads
- `is_active` (BOOLEAN, default true)
- `is_favorite` (BOOLEAN, default false)
- `last_run_at` (TIMESTAMPTZ, nullable)

**1.2 Indexes de performance:**
- idx_reports_object_name, idx_reports_report_type, idx_reports_is_active, idx_reports_is_favorite

**1.3 Trigger para updated_at** (se nao existir)

### Fase 2: Definicao de Campos por Objeto

Criar um arquivo `src/components/reports/reportObjectFields.ts` com a definicao de campos disponiveis para cada objeto:

- **accounts**: id, name, cnpj, website, phone, segment, industry, status, city, state, created_at, updated_at
- **contacts**: id, first_name, last_name, email, phone, company, title, created_at
- **opportunities**: id, name, account_id, amount, probability, stage, expected_close_date, close_date, currency, created_at
- **contracts**: id, name, account_id, contract_type, status, value, currency, start_date, end_date, created_at
- **activities**: id, title, type, status, priority, due_at, done_at, account_id, contact_id, opportunity_id, created_at
- **leads**: id, name, email, phone, company, source, channel, status, estimated_value, created_at

Cada campo tera: name, label, type (text/number/date/select), filterable, sortable, groupable, summarizable

### Fase 3: Motor de Execucao Dinamica

Criar `src/components/reports/reportEngine.ts`:
- Funcao `executeReport(objectName, config)` que constroi queries Supabase dinamicamente
- Aplica filtros com operadores (equals, contains, between, greater_than, etc.)
- Aplica group_by e order_by
- Retorna dados formatados para tabela/grafico/resumo
- Calcula funcoes de resumo (sum, count, avg, min, max)

### Fase 4: Reescrever Pagina de Listagem (`Reports.tsx`)

**4.1 Cabecalho:**
- Titulo: "Relatorios"
- Descricao: "Crie e gerencie relatorios customizados"
- Botao "Novo Relatorio" (abre modal)

**4.2 Barra de Ferramentas:**
- Filtro por Tipo de Objeto (accounts, contacts, opportunities, contracts, activities, leads)
- Filtro por Tipo de Relatorio (table, chart, summary)
- Busca por nome/descricao
- Toggle "Meus Favoritos"

**4.3 Listagem em Grid (cards):**
- Nome, descricao, objeto (badge), tipo (badge), favorito (estrela clicavel), ultima execucao, data criacao
- Botoes: Ver, Editar (builder), Duplicar, Desativar

**4.4 Resumo lateral:**
- Total de relatorios
- Por tipo de objeto
- Por tipo de visualizacao

**4.5 Modal "Novo Relatorio":**
- Campos: Nome (obrigatorio), Descricao, Tipo de Objeto (obrigatorio), Tipo de Relatorio (obrigatorio)
- Ao criar: salva no banco e navega para o builder

**4.6 Manter compatibilidade:** Os relatorios antigos (baseados em templates) continuam visiveis e funcionais via a aba "Templates"

### Fase 5: Criar Pagina do Report Builder (`ReportBuilderPage.tsx`)

**5.1 Layout:** Split horizontal - Painel Esquerdo (30%) + Area de Preview (70%)

**5.2 Painel Esquerdo - 6 Secoes collapsiveis:**

1. **Campos**: Checkboxes para cada campo do objeto selecionado, botoes "Todos/Nenhum/Padrao"
2. **Filtros**: Botao "Adicionar Filtro", para cada filtro: select campo + select operador + input valor + botao remover
3. **Agrupamento**: Botao "Adicionar Agrupamento", select de campo, ordem numerada
4. **Ordenacao**: Botao "Adicionar Ordenacao", select campo + direcao (ASC/DESC)
5. **Visualizacao**: Radio (Tabela/Grafico/Resumo). Se grafico: tipo (bar/line/pie/area), campo X, campo Y, funcao Y
6. **Resumo**: Toggle habilitar, adicionar campos com funcao (sum/count/avg/min/max) e label

**5.3 Area Principal - Preview ao Vivo:**
- Se tabela: tabela com colunas selecionadas, paginacao 15/pagina, linha de resumo
- Se grafico: Recharts interativo
- Se resumo: Cards com valores calculados

**5.4 Barra Superior:**
- Nome do relatorio (editavel)
- Botao "Salvar"
- Botao "Executar" (atualiza preview + last_run_at)
- Botao "Voltar"

### Fase 6: Criar Pagina de Visualizacao (`ReportViewPage.tsx`)

- Cabecalho: nome, descricao, botoes (Editar, Executar Novamente, Exportar, Agendar)
- Filtros rapidos (runtime): alterar filtros sem entrar no builder
- Visualizacao conforme configurado
- Info: ultima execucao, numero de registros

### Fase 7: Rotas

- `/reports` - Listagem (ja existe, sera reescrita)
- `/reports/:id/builder` - Builder visual (novo)
- `/reports/:id/view` - Visualizacao (novo)

---

## Arquivos a Criar/Modificar

| Arquivo | Acao |
|---|---|
| Migration SQL | Criar - colunas novas na reports + indexes |
| `src/components/reports/reportObjectFields.ts` | Criar - definicao de campos por objeto |
| `src/components/reports/reportEngine.ts` | Criar - motor de execucao dinamica |
| `src/components/reports/ReportBuilderVisual.tsx` | Criar - builder visual com painel esquerdo + preview |
| `src/pages/Reports.tsx` | Reescrever - listagem com modal novo relatorio + filtros + favoritos |
| `src/pages/ReportBuilderPage.tsx` | Criar - pagina wrapper do builder |
| `src/pages/ReportViewPage.tsx` | Criar - pagina de visualizacao |
| `src/App.tsx` | Modificar - adicionar rotas /reports/:id/builder e /reports/:id/view |

## Decisoes Tecnicas

- **Edge Functions**: NAO. Seguimos o padrao do projeto usando Supabase client direto
- **Compatibilidade**: Os templates antigos e relatorios salvos continuam funcionando. A nova aba "Builder" coexiste com a aba "Templates"
- **Execucao dinamica**: A query e construida client-side usando `supabase.from(objectName).select(fields).filter(...)`. Nao ha SQL cru - tudo via SDK
- **workspace_id -> tenant_id**: Adaptado ao padrao do projeto
- **Grafico Doughnut/Area**: Doughnut = PieChart com innerRadius. Area = AreaChart do Recharts (ja disponivel como dependencia)

