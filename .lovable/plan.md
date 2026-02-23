

# Correcao do BI Financeiro -- Backfill de Dados Historicos

## Problema Identificado

Os triggers de captura automatica para `receivables`, `payables`, `orders` e `deals` foram criados **apos** os dados ja terem sido inseridos. Resultado:

- **fact_events** contem apenas 6 registros (WhatsApp e contatos), todos com valor R$ 0
- **receivables** tem 11 registros com valores reais (R$ 1.800 cada) que nunca foram capturados
- Widgets como "Receita Total" e "Fluxo de Caixa" mostram "Sem dados" porque consultam fact_events (vazia para financeiro)

## Solucao

Executar uma **migracao SQL de backfill** que insere na `fact_events` todos os registros historicos das tabelas financeiras e de vendas. A partir daqui, novos dados serao capturados automaticamente pelos triggers ja existentes.

### O que sera retroalimentado:

1. **receivables** -- Eventos `receivable_created` com valor real de cada titulo
2. **payables** -- Eventos `payable_created` com valor real de cada titulo  
3. **orders** -- Eventos `order_created` com valor total de cada pedido
4. **deals** -- Eventos `deal_created` e `deal_won` (para deals com status won) com estimated_value

### Detalhes Tecnicos

Uma unica migracao SQL que:
1. Garante que os `dim_event_types` existam para cada tipo de evento (receivable_created, payable_created, order_created, deal_created, deal_won)
2. Insere em `fact_events` um registro para cada linha existente nas tabelas fonte, usando o `created_at` original como `event_timestamp` para manter a cronologia correta
3. Usa `INSERT ... SELECT` para performance
4. Evita duplicatas verificando se o evento ja existe (caso o trigger ja tenha capturado algum dado futuro)

### Resultado Esperado

Apos o backfill:
- Widget "Receita Total" mostrara a soma dos recebiveis
- Widget "Fluxo de Caixa" mostrara recebiveis e pagaveis por mes
- Widget "Contas a Receber vs Pagar" mostrara comparativo
- Todos os dados financeiros existentes aparecerao nos graficos do BI

### Arquivos Modificados
- Nenhum arquivo React sera alterado (a logica de consulta ja funciona corretamente)
- Apenas uma migracao SQL de backfill sera criada

