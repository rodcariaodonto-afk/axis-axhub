

## Integração Pedidos → Contas a Receber (com Split Payment)

### Problema atual
Quando um pedido é criado com formas de pagamento detalhadas (ex: R$10.000 cartão 10x + R$10.000 PIX), o sistema:
1. Salva corretamente os registros em `order_payments`
2. Mas só gera **um único recebível genérico** de 30 dias quando o status muda para "completed"
3. Ignora completamente as datas, parcelas e métodos de pagamento informados

### Solução
Ao criar o pedido, gerar automaticamente os recebíveis baseados nos `order_payments` já inseridos — cada parcela vira um recebível individual com a data correta.

### Mudanças em `src/pages/Orders.tsx`

**Na função `handleCreate` (após inserir `order_payments`):**
- Para cada registro de `orderPayments`, criar um recebível correspondente em `receivables` com:
  - `description`: "Pedido PED-XXX — Cartão Créd. 2/10" (método + parcela)
  - `amount`: valor da parcela individual
  - `due_date`: data calculada do pagamento
  - `order_id`: ID do pedido
  - `customer_id`: cliente selecionado
  - `category_id`: null (pode ser categorizado depois)

**Na função `changeStatus` (quando status = "completed"):**
- Remover a lógica de gerar recebível genérico
- Verificar se já existem recebíveis para o pedido (gerados na criação)
- Se não existir nenhum (pedidos antigos), gerar com a lógica legada

### Exemplo de resultado
Pedido de R$20.000 com Cartão 10x (R$10.000) + PIX (R$10.000):
- Gera 11 recebíveis automaticamente:
  - 10x de R$1.000 (cartão, datas mensais)
  - 1x de R$10.000 (PIX, data informada)

### Arquivos modificados
- `src/pages/Orders.tsx` — lógica de geração de recebíveis na criação do pedido

