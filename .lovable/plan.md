

## Corrigir Campo de Valor nos Pagamentos do Pedido

### Problema
O campo "Valor (R$)" na seção de formas de pagamento usa `type="number"`, que não suporta formatação brasileira. Ao digitar "10.000" (dez mil), o navegador interpreta como "10,00000".

### Solução
Aplicar o mesmo padrão `parseBRCurrency` já usado nos produtos:

**`src/pages/Orders.tsx`**:
1. Adicionar helper `parseBRCurrency` no arquivo
2. Mudar `PaymentEntry.amount` de `number` para `string` (para manter o texto digitado)
3. Trocar o input de `type="number"` para `type="text"` com `inputMode="decimal"`
4. Usar `parseBRCurrency` em todos os cálculos: `totalAllocated`, `remaining`, `addPayment` (valor restante), e no `handleCreate` ao salvar
5. Filtrar caracteres inválidos no onChange (permitir apenas `0-9.,`)

### Arquivo modificado
- `src/pages/Orders.tsx`

