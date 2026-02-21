export type ReportCategory = 'sales' | 'financial' | 'operations';
export type ChartType = 'bar' | 'line' | 'pie' | 'table';

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: ReportCategory;
  icon: string;
  defaultChartType: ChartType;
  defaultConfig: {
    group_by?: string;
    filters?: Record<string, any>;
  };
  availableGroupBy: { value: string; label: string }[];
}

export const REPORT_TEMPLATES: ReportTemplate[] = [
  // === VENDAS ===
  {
    id: 'sales-performance',
    name: 'Performance de Vendas',
    description: 'Análise de deals ganhos, valor total e volume por período',
    category: 'sales',
    icon: 'TrendingUp',
    defaultChartType: 'bar',
    defaultConfig: { group_by: 'month', filters: { status: ['won'] } },
    availableGroupBy: [
      { value: 'month', label: 'Mês' },
      { value: 'responsible', label: 'Vendedor' },
    ],
  },
  {
    id: 'pipeline-analysis',
    name: 'Análise do Pipeline',
    description: 'Distribuição de deals por etapa do pipeline',
    category: 'sales',
    icon: 'Kanban',
    defaultChartType: 'bar',
    defaultConfig: { group_by: 'stage' },
    availableGroupBy: [
      { value: 'stage', label: 'Etapa' },
      { value: 'pipeline', label: 'Pipeline' },
    ],
  },
  {
    id: 'deals-by-seller',
    name: 'Deals por Vendedor',
    description: 'Quantidade e valor de deals por responsável',
    category: 'sales',
    icon: 'Users',
    defaultChartType: 'bar',
    defaultConfig: { group_by: 'responsible' },
    availableGroupBy: [
      { value: 'responsible', label: 'Vendedor' },
      { value: 'status', label: 'Status' },
    ],
  },
  {
    id: 'revenue-forecast',
    name: 'Previsão de Receita',
    description: 'Receita prevista baseada em probabilidade de fechamento',
    category: 'sales',
    icon: 'TrendingUp',
    defaultChartType: 'bar',
    defaultConfig: { group_by: 'month' },
    availableGroupBy: [
      { value: 'month', label: 'Mês' },
      { value: 'stage', label: 'Etapa' },
    ],
  },
  {
    id: 'conversion-rate',
    name: 'Taxa de Conversão',
    description: 'Taxas de conversão entre etapas do funil',
    category: 'sales',
    icon: 'BarChart3',
    defaultChartType: 'bar',
    defaultConfig: { group_by: 'stage' },
    availableGroupBy: [{ value: 'stage', label: 'Etapa' }],
  },
  {
    id: 'sales-cycle',
    name: 'Ciclo de Vendas',
    description: 'Tempo médio para fechar deals por período',
    category: 'sales',
    icon: 'Clock',
    defaultChartType: 'line',
    defaultConfig: { group_by: 'month' },
    availableGroupBy: [
      { value: 'month', label: 'Mês' },
      { value: 'stage', label: 'Etapa' },
    ],
  },
  {
    id: 'lost-deals',
    name: 'Deals Perdidos',
    description: 'Análise dos motivos de perda de deals',
    category: 'sales',
    icon: 'XCircle',
    defaultChartType: 'pie',
    defaultConfig: { group_by: 'reason', filters: { status: ['lost'] } },
    availableGroupBy: [
      { value: 'reason', label: 'Motivo' },
      { value: 'month', label: 'Mês' },
    ],
  },
  // === FINANCEIRO ===
  {
    id: 'cash-flow',
    name: 'Fluxo de Caixa',
    description: 'Entradas e saídas por período',
    category: 'financial',
    icon: 'Banknote',
    defaultChartType: 'line',
    defaultConfig: { group_by: 'month' },
    availableGroupBy: [
      { value: 'month', label: 'Mês' },
      { value: 'week', label: 'Semana' },
    ],
  },
  {
    id: 'receivables-report',
    name: 'Contas a Receber',
    description: 'Valores pendentes e recebidos por período',
    category: 'financial',
    icon: 'ArrowUpCircle',
    defaultChartType: 'bar',
    defaultConfig: { group_by: 'month' },
    availableGroupBy: [
      { value: 'month', label: 'Mês' },
      { value: 'status', label: 'Status' },
      { value: 'customer', label: 'Cliente' },
    ],
  },
  {
    id: 'payables-report',
    name: 'Contas a Pagar',
    description: 'Valores pendentes e pagos por período',
    category: 'financial',
    icon: 'ArrowDownCircle',
    defaultChartType: 'bar',
    defaultConfig: { group_by: 'month' },
    availableGroupBy: [
      { value: 'month', label: 'Mês' },
      { value: 'status', label: 'Status' },
      { value: 'supplier', label: 'Fornecedor' },
    ],
  },
  {
    id: 'revenue-by-period',
    name: 'Receita por Período',
    description: 'Total de receita realizada por mês',
    category: 'financial',
    icon: 'Banknote',
    defaultChartType: 'line',
    defaultConfig: { group_by: 'month' },
    availableGroupBy: [{ value: 'month', label: 'Mês' }],
  },
  {
    id: 'simple-pnl',
    name: 'DRE Simplificado',
    description: 'Receitas vs despesas por período',
    category: 'financial',
    icon: 'FileText',
    defaultChartType: 'bar',
    defaultConfig: { group_by: 'month' },
    availableGroupBy: [{ value: 'month', label: 'Mês' }],
  },
  {
    id: 'overdue-report',
    name: 'Inadimplência',
    description: 'Valores vencidos e não pagos',
    category: 'financial',
    icon: 'AlertTriangle',
    defaultChartType: 'table',
    defaultConfig: { group_by: 'customer' },
    availableGroupBy: [
      { value: 'customer', label: 'Cliente' },
      { value: 'month', label: 'Mês' },
    ],
  },
  // === OPERAÇÕES ===
  {
    id: 'critical-stock',
    name: 'Estoque Crítico',
    description: 'Produtos com estoque abaixo do mínimo',
    category: 'operations',
    icon: 'AlertTriangle',
    defaultChartType: 'table',
    defaultConfig: {},
    availableGroupBy: [],
  },
  {
    id: 'top-products',
    name: 'Produtos Mais Vendidos',
    description: 'Ranking de produtos por quantidade ou valor vendido',
    category: 'operations',
    icon: 'Package',
    defaultChartType: 'bar',
    defaultConfig: { group_by: 'product' },
    availableGroupBy: [{ value: 'product', label: 'Produto' }],
  },
  {
    id: 'orders-by-status',
    name: 'Pedidos por Status',
    description: 'Distribuição de pedidos por status',
    category: 'operations',
    icon: 'ShoppingCart',
    defaultChartType: 'pie',
    defaultConfig: { group_by: 'status' },
    availableGroupBy: [
      { value: 'status', label: 'Status' },
      { value: 'month', label: 'Mês' },
    ],
  },
  {
    id: 'customers-by-segment',
    name: 'Clientes por Segmento',
    description: 'Distribuição de contas CRM por segmento',
    category: 'operations',
    icon: 'Users',
    defaultChartType: 'pie',
    defaultConfig: { group_by: 'segment' },
    availableGroupBy: [{ value: 'segment', label: 'Segmento' }],
  },
  {
    id: 'leads-by-channel',
    name: 'Leads por Canal',
    description: 'Origem e canal dos leads captados',
    category: 'operations',
    icon: 'UserPlus',
    defaultChartType: 'pie',
    defaultConfig: { group_by: 'channel' },
    availableGroupBy: [
      { value: 'channel', label: 'Canal' },
      { value: 'source', label: 'Fonte' },
      { value: 'status', label: 'Status' },
    ],
  },
  {
    id: 'activities-by-type',
    name: 'Atividades por Tipo',
    description: 'Volume de atividades por tipo e período',
    category: 'operations',
    icon: 'CalendarCheck',
    defaultChartType: 'bar',
    defaultConfig: { group_by: 'type' },
    availableGroupBy: [
      { value: 'type', label: 'Tipo' },
      { value: 'month', label: 'Mês' },
    ],
  },
  {
    id: 'purchases-by-supplier',
    name: 'Compras por Fornecedor',
    description: 'Volume e valor de compras por fornecedor',
    category: 'operations',
    icon: 'Truck',
    defaultChartType: 'bar',
    defaultConfig: { group_by: 'supplier' },
    availableGroupBy: [{ value: 'supplier', label: 'Fornecedor' }],
  },
];

export const CATEGORY_LABELS: Record<ReportCategory, string> = {
  sales: 'Vendas',
  financial: 'Financeiro',
  operations: 'Operações',
};
