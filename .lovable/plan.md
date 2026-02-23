

# Correcao do BI -- Conflito de Overload na Funcao RPC

## Problema Raiz

O BI nao exibe dados porque **todas as chamadas RPC falham com erro HTTP 300** (PGRST203). Existem duas versoes da funcao `execute_bi_widget_query` no banco:

1. Versao A: `(p_metric, p_dimension, p_aggregation, p_date_from, p_date_to)` -- retorna `record`
2. Versao B: `(p_metric, p_dimension, p_aggregation, p_date_from, p_date_to, p_filters)` -- retorna `jsonb`

O PostgREST nao consegue escolher qual usar quando o frontend chama sem `p_filters`, resultando em erro 300 em todos os widgets.

Os dados existem na `fact_events` (11 recebiveis com R$ 1.800 cada = R$ 19.800 total). O problema e exclusivamente de resolucao de funcao.

## Solucao

### Passo 1: Migracao SQL -- Eliminar o conflito de overload

Dropar a versao antiga (que retorna `record`) e manter apenas a versao `jsonb` (mais completa). Isso resolve o PGRST203 imediatamente.

```sql
DROP FUNCTION IF EXISTS execute_bi_widget_query(text, text, text, timestamptz, timestamptz);
```

Apenas a versao com `p_filters jsonb DEFAULT '{}'` permanecera, que ja aceita chamadas sem o parametro filters.

### Passo 2: Frontend -- Nenhuma alteracao necessaria

O frontend ja chama a funcao com os parametros corretos (`p_metric`, `p_dimension`, `p_aggregation`, `p_date_from`, `p_date_to`). A versao remanescente aceita esses parametros pois `p_filters` tem valor default.

## Resultado Esperado

Apos dropar a funcao duplicada:
- Todas as chamadas RPC resolverao para a versao unica
- Os widgets exibirao os dados ja existentes na `fact_events`
- "Receita Total" mostrara R$ 19.800 (soma dos recebiveis)
- "Eventos por Mes" e "Receita por Mes" mostrarao graficos com dados historicos

## Detalhes Tecnicos

- **Tipo de mudanca:** Migracao SQL (DROP FUNCTION da versao sem p_filters)
- **Arquivos modificados:** Nenhum arquivo React precisa ser alterado
- **Risco:** Nenhum -- a versao mantida e um superset da removida

