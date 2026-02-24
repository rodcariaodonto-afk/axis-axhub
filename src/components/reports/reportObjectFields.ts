export interface ObjectField {
  name: string;
  label: string;
  type: "text" | "number" | "date" | "select" | "boolean";
  filterable: boolean;
  sortable: boolean;
  groupable: boolean;
  summarizable: boolean;
  options?: string[];
}

export interface ReportObject {
  name: string;
  label: string;
  table: string;
  fields: ObjectField[];
  defaultFields: string[];
}

export const REPORT_OBJECTS: ReportObject[] = [
  {
    name: "accounts",
    label: "Contas",
    table: "crm_accounts",
    defaultFields: ["name", "cnpj", "segment", "phone", "email", "created_at"],
    fields: [
      { name: "id", label: "ID", type: "text", filterable: false, sortable: false, groupable: false, summarizable: false },
      { name: "name", label: "Nome", type: "text", filterable: true, sortable: true, groupable: true, summarizable: false },
      { name: "cnpj", label: "CNPJ", type: "text", filterable: true, sortable: false, groupable: false, summarizable: false },
      { name: "website", label: "Website", type: "text", filterable: false, sortable: false, groupable: false, summarizable: false },
      { name: "phone", label: "Telefone", type: "text", filterable: true, sortable: false, groupable: false, summarizable: false },
      { name: "email", label: "E-mail", type: "text", filterable: true, sortable: true, groupable: false, summarizable: false },
      { name: "segment", label: "Segmento", type: "text", filterable: true, sortable: true, groupable: true, summarizable: false },
      { name: "is_active", label: "Ativo", type: "boolean", filterable: true, sortable: false, groupable: true, summarizable: false },
      { name: "created_at", label: "Criado em", type: "date", filterable: true, sortable: true, groupable: true, summarizable: false },
      { name: "updated_at", label: "Atualizado em", type: "date", filterable: true, sortable: true, groupable: false, summarizable: false },
    ],
  },
  {
    name: "contacts",
    label: "Contatos",
    table: "contacts",
    defaultFields: ["first_name", "last_name", "email", "phone", "position", "created_at"],
    fields: [
      { name: "id", label: "ID", type: "text", filterable: false, sortable: false, groupable: false, summarizable: false },
      { name: "first_name", label: "Nome", type: "text", filterable: true, sortable: true, groupable: false, summarizable: false },
      { name: "last_name", label: "Sobrenome", type: "text", filterable: true, sortable: true, groupable: false, summarizable: false },
      { name: "email", label: "E-mail", type: "text", filterable: true, sortable: true, groupable: false, summarizable: false },
      { name: "phone", label: "Telefone", type: "text", filterable: true, sortable: false, groupable: false, summarizable: false },
      { name: "position", label: "Cargo", type: "text", filterable: true, sortable: true, groupable: true, summarizable: false },
      { name: "created_at", label: "Criado em", type: "date", filterable: true, sortable: true, groupable: true, summarizable: false },
    ],
  },
  {
    name: "opportunities",
    label: "Oportunidades",
    table: "opportunities",
    defaultFields: ["name", "amount", "probability", "stage_id", "expected_close_date", "created_at"],
    fields: [
      { name: "id", label: "ID", type: "text", filterable: false, sortable: false, groupable: false, summarizable: false },
      { name: "name", label: "Nome", type: "text", filterable: true, sortable: true, groupable: false, summarizable: false },
      { name: "amount", label: "Valor", type: "number", filterable: true, sortable: true, groupable: false, summarizable: true },
      { name: "probability", label: "Probabilidade (%)", type: "number", filterable: true, sortable: true, groupable: false, summarizable: true },
      { name: "stage_id", label: "Etapa", type: "text", filterable: true, sortable: true, groupable: true, summarizable: false },
      { name: "expected_close_date", label: "Data Prevista", type: "date", filterable: true, sortable: true, groupable: true, summarizable: false },
      { name: "close_date", label: "Data Fechamento", type: "date", filterable: true, sortable: true, groupable: true, summarizable: false },
      { name: "currency", label: "Moeda", type: "text", filterable: true, sortable: false, groupable: true, summarizable: false },
      { name: "status", label: "Status", type: "text", filterable: true, sortable: true, groupable: true, summarizable: false },
      { name: "created_at", label: "Criado em", type: "date", filterable: true, sortable: true, groupable: true, summarizable: false },
    ],
  },
  {
    name: "contracts",
    label: "Contratos",
    table: "contracts",
    defaultFields: ["name", "contract_type", "status", "value", "start_date", "end_date"],
    fields: [
      { name: "id", label: "ID", type: "text", filterable: false, sortable: false, groupable: false, summarizable: false },
      { name: "name", label: "Nome", type: "text", filterable: true, sortable: true, groupable: false, summarizable: false },
      { name: "contract_type", label: "Tipo", type: "text", filterable: true, sortable: true, groupable: true, summarizable: false },
      { name: "status", label: "Status", type: "text", filterable: true, sortable: true, groupable: true, summarizable: false },
      { name: "value", label: "Valor", type: "number", filterable: true, sortable: true, groupable: false, summarizable: true },
      { name: "currency", label: "Moeda", type: "text", filterable: true, sortable: false, groupable: true, summarizable: false },
      { name: "start_date", label: "Data Início", type: "date", filterable: true, sortable: true, groupable: true, summarizable: false },
      { name: "end_date", label: "Data Fim", type: "date", filterable: true, sortable: true, groupable: true, summarizable: false },
      { name: "created_at", label: "Criado em", type: "date", filterable: true, sortable: true, groupable: true, summarizable: false },
    ],
  },
  {
    name: "activities",
    label: "Atividades",
    table: "activities",
    defaultFields: ["title", "type", "status", "priority", "due_at", "created_at"],
    fields: [
      { name: "id", label: "ID", type: "text", filterable: false, sortable: false, groupable: false, summarizable: false },
      { name: "title", label: "Assunto", type: "text", filterable: true, sortable: true, groupable: false, summarizable: false },
      { name: "type", label: "Tipo", type: "text", filterable: true, sortable: true, groupable: true, summarizable: false },
      { name: "status", label: "Status", type: "text", filterable: true, sortable: true, groupable: true, summarizable: false },
      { name: "priority", label: "Prioridade", type: "text", filterable: true, sortable: true, groupable: true, summarizable: false },
      { name: "due_at", label: "Vencimento", type: "date", filterable: true, sortable: true, groupable: true, summarizable: false },
      { name: "done_at", label: "Concluído em", type: "date", filterable: true, sortable: true, groupable: false, summarizable: false },
      { name: "is_active", label: "Ativo", type: "boolean", filterable: true, sortable: false, groupable: true, summarizable: false },
      { name: "created_at", label: "Criado em", type: "date", filterable: true, sortable: true, groupable: true, summarizable: false },
    ],
  },
  {
    name: "leads",
    label: "Leads",
    table: "leads",
    defaultFields: ["name", "email", "phone", "company", "status", "estimated_value", "created_at"],
    fields: [
      { name: "id", label: "ID", type: "text", filterable: false, sortable: false, groupable: false, summarizable: false },
      { name: "name", label: "Nome", type: "text", filterable: true, sortable: true, groupable: false, summarizable: false },
      { name: "email", label: "E-mail", type: "text", filterable: true, sortable: true, groupable: false, summarizable: false },
      { name: "phone", label: "Telefone", type: "text", filterable: true, sortable: false, groupable: false, summarizable: false },
      { name: "company", label: "Empresa", type: "text", filterable: true, sortable: true, groupable: true, summarizable: false },
      { name: "source", label: "Fonte", type: "text", filterable: true, sortable: true, groupable: true, summarizable: false },
      { name: "channel", label: "Canal", type: "text", filterable: true, sortable: true, groupable: true, summarizable: false },
      { name: "status", label: "Status", type: "text", filterable: true, sortable: true, groupable: true, summarizable: false },
      { name: "estimated_value", label: "Valor Estimado", type: "number", filterable: true, sortable: true, groupable: false, summarizable: true },
      { name: "created_at", label: "Criado em", type: "date", filterable: true, sortable: true, groupable: true, summarizable: false },
    ],
  },
];

export const OBJECT_MAP = Object.fromEntries(REPORT_OBJECTS.map((o) => [o.name, o]));

export type FilterOperator = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "like" | "ilike" | "is";

export const FILTER_OPERATORS: { value: FilterOperator; label: string; types: string[] }[] = [
  { value: "eq", label: "Igual a", types: ["text", "number", "date", "select", "boolean"] },
  { value: "neq", label: "Diferente de", types: ["text", "number", "date", "select", "boolean"] },
  { value: "gt", label: "Maior que", types: ["number", "date"] },
  { value: "gte", label: "Maior ou igual", types: ["number", "date"] },
  { value: "lt", label: "Menor que", types: ["number", "date"] },
  { value: "lte", label: "Menor ou igual", types: ["number", "date"] },
  { value: "ilike", label: "Contém", types: ["text"] },
  { value: "is", label: "É nulo", types: ["text", "number", "date", "select"] },
];

export type SummaryFunction = "sum" | "count" | "avg" | "min" | "max";

export const SUMMARY_FUNCTIONS: { value: SummaryFunction; label: string }[] = [
  { value: "count", label: "Contagem" },
  { value: "sum", label: "Soma" },
  { value: "avg", label: "Média" },
  { value: "min", label: "Mínimo" },
  { value: "max", label: "Máximo" },
];

export interface ReportFilter {
  id: string;
  field: string;
  operator: FilterOperator;
  value: string;
}

export interface ReportSort {
  field: string;
  direction: "asc" | "desc";
}

export interface ReportSummaryField {
  field: string;
  fn: SummaryFunction;
  label: string;
}

export interface VisualReportConfig {
  selectedFields: string[];
  filters: ReportFilter[];
  groupBy: string[];
  orderBy: ReportSort[];
  visualization: "table" | "chart" | "summary";
  chartType?: "bar" | "line" | "pie" | "area";
  chartXField?: string;
  chartYField?: string;
  chartYFunction?: SummaryFunction;
  summaryEnabled: boolean;
  summaryFields: ReportSummaryField[];
}

export function getDefaultConfig(objectName: string): VisualReportConfig {
  const obj = OBJECT_MAP[objectName];
  return {
    selectedFields: obj?.defaultFields || [],
    filters: [],
    groupBy: [],
    orderBy: [{ field: "created_at", direction: "desc" }],
    visualization: "table",
    chartType: "bar",
    chartXField: "",
    chartYField: "",
    chartYFunction: "count",
    summaryEnabled: false,
    summaryFields: [],
  };
}
