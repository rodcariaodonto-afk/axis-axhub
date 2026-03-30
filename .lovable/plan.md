

## Parcelas em Todos os Métodos de Pagamento

### Problema
Atualmente, apenas "Cartão de Crédito" exibe o seletor de parcelas (até 12x). O usuário precisa parcelar em qualquer método (PIX, Boleto, Transferência, etc.).

### Solução

**`src/pages/Orders.tsx`** — 2 mudanças:

1. **Remover condição `pm.method === "credit_card"`** que esconde o seletor de parcelas — exibir o campo "Parcelas" para todos os métodos
2. **Remover reset de parcelas** na linha que faz `if (field === "method" && value !== "credit_card") updated[i].installments = 1` — ao trocar de método, manter o número de parcelas selecionado

### Arquivo modificado
- `src/pages/Orders.tsx`

