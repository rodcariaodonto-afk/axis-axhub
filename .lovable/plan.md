

# Corrigir Dashboards para Dados Reais (Sem Limite de 1000)

## Problema

O Supabase tem um limite padrao de 1000 linhas por query. O `CrmDashboard.tsx` faz `select("*")` e conta no client-side, resultando em numeros truncados (ex: mostra 1000 leads quando existem 47.326).

## Solucao

Reescrever as queries do CRM Dashboard para usar **contagens server-side** (`count: "exact"` com `head: true`) e **agregacoes via RPC** ao inves de buscar todas as linhas e contar no JavaScript.

## Dados Reais no Banco

| Tabela | Total |
|---|---|
| leads | 47.326 (todos status "new") |
| contacts | 150 |
| whatsapp_messages | 3.876 |
| fact_events | 3.598 |
| receivables | 11 |
| products | 9 |
| customers | 1 |
| deals | 0 |
| orders | 0 |

## Arquivo a Modificar

**`src/pages/CrmDashboard.tsx`** - Reescrever completamente as queries:

### Queries Atuais (Erradas)
```typescript
// Busca TODAS as linhas (capped em 1000) e conta no JS
supabase.from("leads").select("*")
supabase.from("deals").select("*, pipeline_stages(name, order)")
```

### Queries Novas (Corretas)

1. **Total de Leads**: `supabase.from("leads").select("id", { count: "exact", head: true })` -- retorna 47.326
2. **Leads do Mes**: `supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", firstDayOfMonth)` -- contagem server-side
3. **Leads Convertidos**: `supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "converted")`
4. **Deals por Status**: 3 queries separadas com `count: "exact", head: true` para open/won/lost
5. **Receita (deals open)**: `supabase.from("deals").select("estimated_value").eq("status", "open")` -- soma no JS (poucas linhas)
6. **Receita (deals won)**: `supabase.from("deals").select("estimated_value").eq("status", "won")`
7. **Leads por Origem (grafico)**: Criar uma funcao RPC `count_leads_by_field` para agregar no banco, ou usar query com group-by via select limitado aos top 10
8. **Leads por Status (grafico)**: Mesma abordagem - agregacao server-side

### Estrategia para Graficos (Leads por Origem / Status)

Como o Supabase client nao suporta `GROUP BY` nativamente, temos 2 opcoes:

**Opcao escolhida: Funcao RPC simples**

Criar uma funcao SQL `count_leads_by_column(p_column text)` que faz:
```sql
SELECT source as label, COUNT(*) as value FROM leads 
WHERE tenant_id = get_user_tenant_id() 
GROUP BY source ORDER BY value DESC LIMIT 20
```

Duas funcoes RPC pequenas:
- `count_leads_by_source()` -- retorna [{label, value}]
- `count_leads_by_status()` -- retorna [{label, value}]

### Migracao SQL

Criar 2 funcoes RPC:
1. `count_leads_by_source(p_tenant_id uuid)` -- GROUP BY source
2. `count_leads_by_status(p_tenant_id uuid)` -- GROUP BY status

### Mudancas no Componente

O componente deixa de usar `useState` com arrays gigantes de leads/deals e passa a usar:
- `useState` apenas para os KPIs numericos (totalLeads, monthLeads, conversionRate, openDeals, forecastValue, wonValue)
- `useState` para os dados de grafico ja agregados (sourceData, statusData)
- Todas as queries rodam em paralelo via `Promise.all`
- Loading state continua igual

### Resultado Final

Os numeros exibidos serao os reais do banco:
- Leads (mes): contagem real filtrada por mes atual
- Total Leads: 47.326 (real)
- Conversao: 0% (nenhum lead com status "converted")
- Deals Abertos: 0
- Receita Prevista: R$ 0
- Receita Fechada: R$ 0
- Grafico Leads por Origem: dados reais agregados
- Grafico Leads por Status: 47.326 como "Novo"

