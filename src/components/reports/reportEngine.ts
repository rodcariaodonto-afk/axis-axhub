import { supabase } from "@/integrations/supabase/client";
import {
  OBJECT_MAP,
  type VisualReportConfig,
  type FilterOperator,
  type SummaryFunction,
} from "./reportObjectFields";

export interface ReportResult {
  rows: Record<string, any>[];
  totalCount: number;
  summaryValues: { label: string; value: number }[];
  groupedData: { label: string; value: number }[];
}

function getSupabaseTable(objectName: string) {
  const obj = OBJECT_MAP[objectName];
  if (!obj) throw new Error(`Object ${objectName} not found`);
  return obj.table;
}

function applyFilter(
  query: any,
  field: string,
  operator: FilterOperator,
  value: string
) {
  switch (operator) {
    case "eq":
      return query.eq(field, value);
    case "neq":
      return query.neq(field, value);
    case "gt":
      return query.gt(field, value);
    case "gte":
      return query.gte(field, value);
    case "lt":
      return query.lt(field, value);
    case "lte":
      return query.lte(field, value);
    case "ilike":
      return query.ilike(field, `%${value}%`);
    case "is":
      return query.is(field, null);
    default:
      return query;
  }
}

export async function executeReport(
  objectName: string,
  config: VisualReportConfig,
  page: number = 1,
  pageSize: number = 15
): Promise<ReportResult> {
  const tableName = getSupabaseTable(objectName);
  const selectFields = config.selectedFields.length > 0 ? config.selectedFields.join(",") : "*";

  // Main query
  let query = (supabase.from as any)(tableName).select(selectFields, { count: "exact" });

  // Apply filters
  for (const filter of config.filters) {
    if (filter.field && filter.operator) {
      query = applyFilter(query, filter.field, filter.operator, filter.value);
    }
  }

  // Apply ordering
  for (const sort of config.orderBy) {
    query = query.order(sort.field, { ascending: sort.direction === "asc" });
  }

  // Apply pagination
  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  const rows = (data || []) as Record<string, any>[];
  const totalCount = count || 0;

  // Calculate summaries
  let summaryValues: { label: string; value: number }[] = [];
  if (config.summaryEnabled && config.summaryFields.length > 0) {
    // Fetch all data for summary (no pagination)
    let summaryQuery = (supabase.from as any)(tableName).select(selectFields);
    for (const filter of config.filters) {
      if (filter.field && filter.operator) {
        summaryQuery = applyFilter(summaryQuery, filter.field, filter.operator, filter.value);
      }
    }
    const { data: allData } = await summaryQuery;
    const allRows = (allData || []) as Record<string, any>[];

    summaryValues = config.summaryFields.map((sf) => {
      const values = allRows
        .map((r) => parseFloat(r[sf.field]))
        .filter((v) => !isNaN(v));
      let value = 0;
      switch (sf.fn) {
        case "count":
          value = values.length;
          break;
        case "sum":
          value = values.reduce((a, b) => a + b, 0);
          break;
        case "avg":
          value = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
          break;
        case "min":
          value = values.length > 0 ? Math.min(...values) : 0;
          break;
        case "max":
          value = values.length > 0 ? Math.max(...values) : 0;
          break;
      }
      return { label: sf.label || `${sf.fn}(${sf.field})`, value };
    });
  }

  // Grouped data for charts
  let groupedData: { label: string; value: number }[] = [];
  if (config.visualization === "chart" && config.chartXField) {
    let chartQuery = (supabase.from as any)(tableName).select("*");
    for (const filter of config.filters) {
      if (filter.field && filter.operator) {
        chartQuery = applyFilter(chartQuery, filter.field, filter.operator, filter.value);
      }
    }
    const { data: chartData } = await chartQuery;
    const chartRows = (chartData || []) as Record<string, any>[];

    const groups: Record<string, number[]> = {};
    for (const row of chartRows) {
      const key = String(row[config.chartXField] ?? "N/A");
      if (!groups[key]) groups[key] = [];
      if (config.chartYField) {
        const val = parseFloat(row[config.chartYField]);
        if (!isNaN(val)) groups[key].push(val);
      } else {
        groups[key].push(1);
      }
    }

    const fn: SummaryFunction = config.chartYFunction || "count";
    groupedData = Object.entries(groups).map(([label, values]) => {
      let value = 0;
      switch (fn) {
        case "count":
          value = values.length;
          break;
        case "sum":
          value = values.reduce((a, b) => a + b, 0);
          break;
        case "avg":
          value = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
          break;
        case "min":
          value = values.length > 0 ? Math.min(...values) : 0;
          break;
        case "max":
          value = values.length > 0 ? Math.max(...values) : 0;
          break;
      }
      return { label, value };
    });

    groupedData.sort((a, b) => b.value - a.value);
    if (groupedData.length > 50) groupedData = groupedData.slice(0, 50);
  }

  return { rows, totalCount, summaryValues, groupedData };
}
