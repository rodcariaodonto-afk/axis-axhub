

## Corrigir Integração Pedidos → Contas a Receber

### Diagnóstico
O pedido `PED-MNCH3UP8` foi criado **antes** do código de integração com recebíveis ser implantado. Os `order_payments` (11 registros) existem no banco, mas os `receivables` correspondentes nunca foram gerados. Não é necessário aprovar o pedido — os recebíveis devem ser criados automaticamente na hora da criação do pedido.

### O que será feito

**1. Corrigir pedido existente** — Inserir os 11 recebíveis faltantes diretamente no banco via migração SQL, baseados nos `order_payments` já existentes para o pedido `PED-MNCH3UP8`.

**2. Adicionar backfill genérico** — Na mesma migração, gerar recebíveis para qualquer pedido que tenha `order_payments` mas não tenha `receivables` associados (segurança contra outros pedidos futuros com o mesmo problema).

### Detalhes técnicos
A migração faz um `INSERT INTO receivables ... SELECT` dos `order_payments` que não possuem recebível correspondente, usando `LEFT JOIN` para detectar lacunas.

### Arquivos
- 1 migração SQL (backfill de recebíveis faltantes)
- Nenhuma alteração de código (a lógica no `Orders.tsx` já gera recebíveis na criação)

