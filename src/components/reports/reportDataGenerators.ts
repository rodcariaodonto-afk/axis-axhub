import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface ReportData {
  labels: string[];
  datasets: { label: string; data: number[] }[];
  summary: { label: string; value: string }[];
  tableData?: Record<string, any>[];
}

export interface ReportConfig {
  dateRange: { start: string; end: string };
  group_by: string;
  filters?: Record<string, any>;
}

function monthKey(dateStr: string) {
  return format(parseISO(dateStr), 'MMM/yy', { locale: ptBR });
}

function groupByMonth(items: any[], dateField: string, valueField: string) {
  const map = new Map<string, number>();
  items.forEach((item) => {
    const key = monthKey(item[dateField]);
    map.set(key, (map.get(key) || 0) + Number(item[valueField] || 0));
  });
  return { labels: Array.from(map.keys()), data: Array.from(map.values()) };
}

function groupByField(items: any[], field: string, valueField?: string) {
  const map = new Map<string, { count: number; value: number }>();
  items.forEach((item) => {
    const key = String(item[field] || 'N/A');
    const prev = map.get(key) || { count: 0, value: 0 };
    map.set(key, { count: prev.count + 1, value: prev.value + Number(item[valueField || ''] || 0) });
  });
  return {
    labels: Array.from(map.keys()),
    counts: Array.from(map.values()).map((v) => v.count),
    values: Array.from(map.values()).map((v) => v.value),
  };
}

const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export async function generateReportData(templateId: string, config: ReportConfig): Promise<ReportData> {
  const { start, end } = config.dateRange;

  switch (templateId) {
    case 'sales-performance': {
      const { data: deals } = await supabase
        .from('deals')
        .select('*, profiles:responsible_user_id(full_name)')
        .in('status', config.filters?.status || ['won'])
        .gte('created_at', start)
        .lte('created_at', end);
      const items = deals || [];
      if (config.group_by === 'month') {
        const g = groupByMonth(items, 'created_at', 'estimated_value');
        return {
          labels: g.labels,
          datasets: [{ label: 'Valor', data: g.data }],
          summary: [
            { label: 'Total', value: fmt(items.reduce((s, d) => s + Number(d.estimated_value || 0), 0)) },
            { label: 'Quantidade', value: String(items.length) },
          ],
        };
      }
      const g = groupByField(items, 'profiles.full_name' in (items[0] || {}) ? 'responsible_user_id' : 'responsible_user_id', 'estimated_value');
      return { labels: g.labels, datasets: [{ label: 'Valor', data: g.values }], summary: [{ label: 'Total', value: fmt(g.values.reduce((a, b) => a + b, 0)) }] };
    }

    case 'pipeline-analysis': {
      const { data: deals } = await supabase
        .from('deals')
        .select('*, pipeline_stages(name)')
        .eq('status', 'open')
        .gte('created_at', start)
        .lte('created_at', end);
      const items = deals || [];
      const stageMap = new Map<string, { count: number; value: number }>();
      items.forEach((d: any) => {
        const name = d.pipeline_stages?.name || 'N/A';
        const prev = stageMap.get(name) || { count: 0, value: 0 };
        stageMap.set(name, { count: prev.count + 1, value: prev.value + Number(d.estimated_value || 0) });
      });
      return {
        labels: Array.from(stageMap.keys()),
        datasets: [
          { label: 'Deals', data: Array.from(stageMap.values()).map((v) => v.count) },
          { label: 'Valor', data: Array.from(stageMap.values()).map((v) => v.value) },
        ],
        summary: [
          { label: 'Total Deals', value: String(items.length) },
          { label: 'Valor Total', value: fmt(items.reduce((s, d) => s + Number(d.estimated_value || 0), 0)) },
        ],
      };
    }

    case 'deals-by-seller': {
      const { data: deals } = await supabase
        .from('deals')
        .select('*, profiles:responsible_user_id(full_name)')
        .gte('created_at', start)
        .lte('created_at', end);
      const items = deals || [];
      const sellerMap = new Map<string, { count: number; value: number }>();
      items.forEach((d: any) => {
        const name = (d as any).profiles?.full_name || 'Sem responsável';
        const prev = sellerMap.get(name) || { count: 0, value: 0 };
        sellerMap.set(name, { count: prev.count + 1, value: prev.value + Number(d.estimated_value || 0) });
      });
      return {
        labels: Array.from(sellerMap.keys()),
        datasets: [{ label: 'Deals', data: Array.from(sellerMap.values()).map((v) => v.count) }],
        summary: [
          { label: 'Vendedores', value: String(sellerMap.size) },
          { label: 'Total Deals', value: String(items.length) },
        ],
      };
    }

    case 'revenue-forecast': {
      const { data: deals } = await supabase
        .from('deals')
        .select('*, pipeline_stages(name, probability)')
        .eq('status', 'open')
        .gte('expected_close_date', start)
        .lte('expected_close_date', end);
      const items = deals || [];
      const g = groupByMonth(items.map((d: any) => ({
        ...d,
        weighted_value: Number(d.estimated_value || 0) * (Number(d.pipeline_stages?.probability || 0) / 100),
        created_at: d.expected_close_date || d.created_at,
      })), 'created_at', 'weighted_value');
      return {
        labels: g.labels,
        datasets: [{ label: 'Receita Prevista', data: g.data }],
        summary: [
          { label: 'Total Previsto', value: fmt(g.data.reduce((a, b) => a + b, 0)) },
          { label: 'Deals', value: String(items.length) },
        ],
      };
    }

    case 'conversion-rate': {
      const { data: deals } = await supabase
        .from('deals')
        .select('*, pipeline_stages(name, "order")')
        .gte('created_at', start)
        .lte('created_at', end);
      const items = deals || [];
      const total = items.length || 1;
      const won = items.filter((d) => d.status === 'won').length;
      const lost = items.filter((d) => d.status === 'lost').length;
      const open = items.filter((d) => d.status === 'open').length;
      return {
        labels: ['Abertos', 'Ganhos', 'Perdidos'],
        datasets: [{ label: 'Quantidade', data: [open, won, lost] }],
        summary: [
          { label: 'Taxa de Ganho', value: `${Math.round((won / total) * 100)}%` },
          { label: 'Total Deals', value: String(total) },
        ],
      };
    }

    case 'sales-cycle': {
      const { data: deals } = await supabase
        .from('deals')
        .select('*')
        .in('status', ['won', 'lost'])
        .gte('created_at', start)
        .lte('created_at', end);
      const items = deals || [];
      const monthMap = new Map<string, number[]>();
      items.forEach((d) => {
        const key = monthKey(d.created_at);
        const days = Math.round((new Date(d.updated_at).getTime() - new Date(d.created_at).getTime()) / 86400000);
        const arr = monthMap.get(key) || [];
        arr.push(days);
        monthMap.set(key, arr);
      });
      const labels = Array.from(monthMap.keys());
      const data = labels.map((k) => {
        const arr = monthMap.get(k)!;
        return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
      });
      return {
        labels,
        datasets: [{ label: 'Dias médios', data }],
        summary: [
          { label: 'Média Geral', value: `${data.length > 0 ? Math.round(data.reduce((a, b) => a + b, 0) / data.length) : 0} dias` },
        ],
      };
    }

    case 'lost-deals': {
      const { data: deals } = await supabase
        .from('deals')
        .select('*')
        .eq('status', 'lost')
        .gte('created_at', start)
        .lte('created_at', end);
      const items = deals || [];
      const g = groupByField(items, 'lost_reason', 'estimated_value');
      return {
        labels: g.labels,
        datasets: [{ label: 'Quantidade', data: g.counts }],
        summary: [
          { label: 'Total Perdidos', value: String(items.length) },
          { label: 'Valor Perdido', value: fmt(items.reduce((s, d) => s + Number(d.estimated_value || 0), 0)) },
        ],
      };
    }

    case 'cash-flow': {
      const [{ data: rec }, { data: pay }] = await Promise.all([
        supabase.from('receivables').select('*').eq('status', 'paid').gte('paid_at', start).lte('paid_at', end),
        supabase.from('payables').select('*').eq('status', 'paid').gte('paid_at', start).lte('paid_at', end),
      ]);
      const recItems = rec || [];
      const payItems = pay || [];
      const allMonths = new Set<string>();
      recItems.forEach((r) => allMonths.add(monthKey(r.paid_at!)));
      payItems.forEach((p) => allMonths.add(monthKey(p.paid_at!)));
      const labels = Array.from(allMonths).sort();
      const recByMonth = new Map<string, number>();
      const payByMonth = new Map<string, number>();
      recItems.forEach((r) => { const k = monthKey(r.paid_at!); recByMonth.set(k, (recByMonth.get(k) || 0) + Number(r.amount)); });
      payItems.forEach((p) => { const k = monthKey(p.paid_at!); payByMonth.set(k, (payByMonth.get(k) || 0) + Number(p.amount)); });
      return {
        labels,
        datasets: [
          { label: 'Entradas', data: labels.map((l) => recByMonth.get(l) || 0) },
          { label: 'Saídas', data: labels.map((l) => payByMonth.get(l) || 0) },
        ],
        summary: [
          { label: 'Total Entradas', value: fmt(recItems.reduce((s, r) => s + Number(r.amount), 0)) },
          { label: 'Total Saídas', value: fmt(payItems.reduce((s, p) => s + Number(p.amount), 0)) },
        ],
      };
    }

    case 'receivables-report': {
      const { data: recs } = await supabase
        .from('receivables')
        .select('*, customers(name)')
        .gte('due_date', start)
        .lte('due_date', end);
      const items = recs || [];
      if (config.group_by === 'status') {
        const g = groupByField(items, 'status', 'amount');
        return { labels: g.labels, datasets: [{ label: 'Valor', data: g.values }], summary: [{ label: 'Total', value: fmt(g.values.reduce((a, b) => a + b, 0)) }] };
      }
      const g = groupByMonth(items, 'due_date', 'amount');
      return { labels: g.labels, datasets: [{ label: 'Valor', data: g.data }], summary: [{ label: 'Total', value: fmt(g.data.reduce((a, b) => a + b, 0)) }] };
    }

    case 'payables-report': {
      const { data: pays } = await supabase
        .from('payables')
        .select('*, suppliers(name)')
        .gte('due_date', start)
        .lte('due_date', end);
      const items = pays || [];
      if (config.group_by === 'status') {
        const g = groupByField(items, 'status', 'amount');
        return { labels: g.labels, datasets: [{ label: 'Valor', data: g.values }], summary: [{ label: 'Total', value: fmt(g.values.reduce((a, b) => a + b, 0)) }] };
      }
      const g = groupByMonth(items, 'due_date', 'amount');
      return { labels: g.labels, datasets: [{ label: 'Valor', data: g.data }], summary: [{ label: 'Total', value: fmt(g.data.reduce((a, b) => a + b, 0)) }] };
    }

    case 'revenue-by-period': {
      const { data: recs } = await supabase.from('receivables').select('*').eq('status', 'paid').gte('paid_at', start).lte('paid_at', end);
      const items = recs || [];
      const g = groupByMonth(items, 'paid_at', 'amount');
      return { labels: g.labels, datasets: [{ label: 'Receita', data: g.data }], summary: [{ label: 'Total', value: fmt(g.data.reduce((a, b) => a + b, 0)) }] };
    }

    case 'simple-pnl': {
      const [{ data: rec }, { data: pay }] = await Promise.all([
        supabase.from('receivables').select('*').eq('status', 'paid').gte('paid_at', start).lte('paid_at', end),
        supabase.from('payables').select('*').eq('status', 'paid').gte('paid_at', start).lte('paid_at', end),
      ]);
      const recItems = rec || [];
      const payItems = pay || [];
      const allMonths = new Set<string>();
      recItems.forEach((r) => allMonths.add(monthKey(r.paid_at!)));
      payItems.forEach((p) => allMonths.add(monthKey(p.paid_at!)));
      const labels = Array.from(allMonths).sort();
      const recMap = new Map<string, number>();
      const payMap = new Map<string, number>();
      recItems.forEach((r) => { const k = monthKey(r.paid_at!); recMap.set(k, (recMap.get(k) || 0) + Number(r.amount)); });
      payItems.forEach((p) => { const k = monthKey(p.paid_at!); payMap.set(k, (payMap.get(k) || 0) + Number(p.amount)); });
      const totalRec = recItems.reduce((s, r) => s + Number(r.amount), 0);
      const totalPay = payItems.reduce((s, p) => s + Number(p.amount), 0);
      return {
        labels,
        datasets: [
          { label: 'Receitas', data: labels.map((l) => recMap.get(l) || 0) },
          { label: 'Despesas', data: labels.map((l) => payMap.get(l) || 0) },
        ],
        summary: [
          { label: 'Receitas', value: fmt(totalRec) },
          { label: 'Despesas', value: fmt(totalPay) },
          { label: 'Resultado', value: fmt(totalRec - totalPay) },
        ],
      };
    }

    case 'overdue-report': {
      const today = new Date().toISOString().split('T')[0];
      const { data: recs } = await supabase
        .from('receivables')
        .select('*, customers(name)')
        .eq('status', 'pending')
        .lt('due_date', today);
      const items = recs || [];
      const total = items.reduce((s, r) => s + Number(r.amount), 0);
      return {
        labels: ['Vencido'],
        datasets: [{ label: 'Valor', data: [total] }],
        summary: [
          { label: 'Total Vencido', value: fmt(total) },
          { label: 'Títulos', value: String(items.length) },
        ],
        tableData: items.map((r: any) => ({
          Cliente: r.customers?.name || 'N/A',
          Descrição: r.description,
          Valor: fmt(Number(r.amount)),
          Vencimento: r.due_date,
        })),
      };
    }

    case 'critical-stock': {
      const { data: stocks } = await supabase
        .from('product_stock')
        .select('*, products(name, sku)')
        .filter('quantity', 'lte', 'min_quantity' as any);
      // Filter client-side since we can't do column comparison in supabase-js
      const items = (stocks || []).filter((s) => s.quantity <= s.min_quantity);
      return {
        labels: ['Crítico'],
        datasets: [{ label: 'Produtos', data: [items.length] }],
        summary: [{ label: 'Produtos em Alerta', value: String(items.length) }],
        tableData: items.map((s: any) => ({
          Produto: s.products?.name || 'N/A',
          SKU: s.products?.sku || '',
          Quantidade: s.quantity,
          Mínimo: s.min_quantity,
        })),
      };
    }

    case 'top-products': {
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('*, products(name), orders!inner(created_at, status)')
        .gte('orders.created_at', start)
        .lte('orders.created_at', end);
      const items = orderItems || [];
      const productMap = new Map<string, { qty: number; value: number }>();
      items.forEach((oi: any) => {
        const name = oi.products?.name || 'N/A';
        const prev = productMap.get(name) || { qty: 0, value: 0 };
        productMap.set(name, { qty: prev.qty + oi.quantity, value: prev.value + Number(oi.total) });
      });
      const sorted = Array.from(productMap.entries()).sort((a, b) => b[1].value - a[1].value).slice(0, 10);
      return {
        labels: sorted.map(([name]) => name),
        datasets: [{ label: 'Valor', data: sorted.map(([, v]) => v.value) }],
        summary: [
          { label: 'Produtos', value: String(productMap.size) },
          { label: 'Valor Total', value: fmt(sorted.reduce((s, [, v]) => s + v.value, 0)) },
        ],
      };
    }

    case 'orders-by-status': {
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', start)
        .lte('created_at', end);
      const items = orders || [];
      const g = groupByField(items, 'status', 'total');
      return {
        labels: g.labels,
        datasets: [{ label: 'Pedidos', data: g.counts }],
        summary: [
          { label: 'Total Pedidos', value: String(items.length) },
          { label: 'Valor Total', value: fmt(items.reduce((s, o) => s + Number(o.total), 0)) },
        ],
      };
    }

    case 'customers-by-segment': {
      const { data: accounts } = await supabase.from('crm_accounts').select('*');
      const items = accounts || [];
      const g = groupByField(items, 'segment');
      return {
        labels: g.labels,
        datasets: [{ label: 'Contas', data: g.counts }],
        summary: [{ label: 'Total Contas', value: String(items.length) }],
      };
    }

    case 'leads-by-channel': {
      const { data: leads } = await supabase
        .from('leads')
        .select('*')
        .gte('created_at', start)
        .lte('created_at', end);
      const items = leads || [];
      const field = config.group_by === 'source' ? 'source' : config.group_by === 'status' ? 'status' : 'channel';
      const g = groupByField(items, field);
      return {
        labels: g.labels,
        datasets: [{ label: 'Leads', data: g.counts }],
        summary: [{ label: 'Total Leads', value: String(items.length) }],
      };
    }

    case 'activities-by-type': {
      const { data: activities } = await supabase
        .from('activities')
        .select('*')
        .gte('created_at', start)
        .lte('created_at', end);
      const items = activities || [];
      if (config.group_by === 'month') {
        const countMap = new Map<string, number>();
        items.forEach((a) => { const k = monthKey(a.created_at); countMap.set(k, (countMap.get(k) || 0) + 1); });
        return {
          labels: Array.from(countMap.keys()),
          datasets: [{ label: 'Atividades', data: Array.from(countMap.values()) }],
          summary: [{ label: 'Total', value: String(items.length) }],
        };
      }
      const g = groupByField(items, 'type');
      return {
        labels: g.labels,
        datasets: [{ label: 'Atividades', data: g.counts }],
        summary: [{ label: 'Total', value: String(items.length) }],
      };
    }

    case 'purchases-by-supplier': {
      const { data: pos } = await supabase
        .from('purchase_orders')
        .select('*, suppliers(name)')
        .gte('created_at', start)
        .lte('created_at', end);
      const items = pos || [];
      const supplierMap = new Map<string, { count: number; value: number }>();
      items.forEach((po: any) => {
        const name = po.suppliers?.name || 'N/A';
        const prev = supplierMap.get(name) || { count: 0, value: 0 };
        supplierMap.set(name, { count: prev.count + 1, value: prev.value + Number(po.total_amount) });
      });
      const sorted = Array.from(supplierMap.entries()).sort((a, b) => b[1].value - a[1].value);
      return {
        labels: sorted.map(([n]) => n),
        datasets: [{ label: 'Valor', data: sorted.map(([, v]) => v.value) }],
        summary: [
          { label: 'Fornecedores', value: String(supplierMap.size) },
          { label: 'Total', value: fmt(sorted.reduce((s, [, v]) => s + v.value, 0)) },
        ],
      };
    }

    default:
      return { labels: [], datasets: [], summary: [{ label: 'Erro', value: 'Template não encontrado' }] };
  }
}
