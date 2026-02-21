

# Sistema de Relatorios Dinamicos

## Visao Geral

Criar um sistema de relatorios com templates pre-construidos, visualizacao interativa com graficos (Recharts, ja instalado), exportacao CSV/PDF, e armazenamento de relatorios salvos. A spec sera adaptada ao projeto existente (tenant_id, sem Redis/Puppeteer/SendGrid).

## O que existe hoje

- Pagina `FunnelReport.tsx` com relatorio hardcoded do pipeline de vendas
- Recharts ja instalado e em uso
- Dados de deals, orders, products, customers, leads, receivables, payables disponiveis
- Nenhuma tabela de relatorios no banco

## Adaptacoes da spec ao projeto

- `workspace_id` sera `tenant_id`
- Sem Redis - dados gerados on-demand e cacheados no campo `data` JSONB
- Sem Puppeteer/SendGrid - exportacao PDF via jsPDF (client-side), CSV via Blob nativo
- Sem agendamento real (sem cron/email) - tabela `report_schedules` sera criada mas o agendamento sera apenas visual/placeholder
- Templates como constantes no frontend (mesmo padrao do `connectorsCatalog.ts`)
- Sem CHECK constraints - usar validation triggers conforme guidelines
- `shared_with` como JSONB array em vez de UUID[] nativo (compatibilidade com tipos Supabase)

## O que sera construido

### 1. Tabelas no banco de dados

**reports** - Relatorios salvos pelo usuario
- id, tenant_id, name, description, template_id, config (JSONB com filtros/agrupamentos), data (JSONB com dados em cache), chart_type, is_public, shared_with (JSONB), created_by, created_at, updated_at

**report_exports** - Historico de exportacoes
- id, report_id (FK), tenant_id, format, file_url, file_size, status, error_message, created_by, created_at, completed_at

**report_schedules** - Agendamentos (estrutura para uso futuro)
- id, report_id (FK), tenant_id, frequency, day_of_week, day_of_month, time_of_day, recipients (TEXT[]), format, is_active, last_sent_at, next_send_at, created_at

RLS: isolamento por tenant_id, leitura de relatorios publicos ou proprios, escrita restrita ao criador/admin.

### 2. Templates pre-definidos (constante frontend)

20 templates organizados em 3 categorias:

**Vendas (sales):**
- Performance de Vendas, Analise do Pipeline, Deals por Vendedor, Previsao de Receita, Taxa de Conversao, Ciclo de Vendas, Deals Perdidos

**Financeiro (financial):**
- Fluxo de Caixa, Contas a Receber, Contas a Pagar, Receita por Periodo, DRE Simplificado, Inadimplencia

**Operacoes (operations):**
- Estoque Critico, Produtos Mais Vendidos, Pedidos por Status, Clientes por Segmento, Leads por Canal, Atividades por Tipo, Compras por Fornecedor

Cada template define: id, nome, descricao, categoria, chart_type padrao, config padrao (filtros, group_by), e uma funcao de query que busca os dados corretos das tabelas existentes.

### 3. Componentes React

**ReportTemplateSelector** - Grid de cards com templates por categoria, busca por nome
**ReportBuilder** - Configurador com: seletor de periodo, group_by, chart_type (bar/line/pie/table), filtros especificos do template, preview em tempo real
**ReportViewer** - Visualizador com grafico Recharts + tabela de dados + cards de resumo
**ReportExportBar** - Botoes de exportacao (CSV, PDF) com status de processamento
**ReportScheduleDialog** - Dialog para configurar agendamento (UI pronta, sem envio real)

### 4. Pagina e rotas

- Nova pagina `src/pages/Reports.tsx` com abas: Templates, Meus Relatorios, (construtor inline)
- Rota `/reports` no App.tsx
- Link "Relatorios" na sidebar no grupo CRM (ou novo grupo "Relatorios")

### 5. Logica de geracao de dados

Cada template tera uma funcao async que:
1. Recebe config (date_range, group_by, filters)
2. Faz queries nas tabelas existentes (deals, orders, products, etc.) via Supabase client
3. Agrega/agrupa os dados
4. Retorna formato padrao: `{ labels: string[], datasets: { label, data }[], summary: { label, value }[] }`

Exemplo para "Performance de Vendas":
```text
Query: deals WHERE status IN config.filters.status AND created_at BETWEEN start AND end
Group by: responsible_user_id ou stage_id
Return: contagem e valor por grupo
```

### 6. Exportacao

**CSV**: Gerar string CSV client-side a partir dos dados do relatorio, download via Blob/URL.createObjectURL
**PDF**: Usar jsPDF (nova dependencia) para gerar PDF com titulo, tabela de dados e metadados. Sem graficos no PDF (limitacao client-side sem canvas-to-image).

## Detalhes Tecnicos

### Migracao SQL

```sql
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  template_id VARCHAR(100),
  config JSONB NOT NULL DEFAULT '{}',
  data JSONB,
  chart_type VARCHAR(50) DEFAULT 'bar',
  is_public BOOLEAN DEFAULT false,
  shared_with JSONB DEFAULT '[]',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.report_exports (...);
CREATE TABLE public.report_schedules (...);
-- + indices, RLS, trigger updated_at
```

### Estrutura de arquivos

```text
src/components/reports/
  reportTemplates.ts         -- constantes com 20 templates
  reportDataGenerators.ts    -- funcoes de query por template
  ReportTemplateSelector.tsx
  ReportBuilder.tsx
  ReportViewer.tsx
  ReportExportBar.tsx
  ReportScheduleDialog.tsx
src/pages/Reports.tsx
```

### Dependencias

- `jspdf` - geracao de PDF client-side (nova)

## Sequencia de implementacao

1. Criar migracao com 3 tabelas (reports, report_exports, report_schedules) + RLS + indices
2. Criar catalogo de templates e funcoes de geracao de dados
3. Criar componentes React (TemplateSelector, Builder, Viewer, ExportBar)
4. Criar pagina Reports.tsx com abas
5. Adicionar rota e link na sidebar
6. Implementar exportacao CSV e PDF

