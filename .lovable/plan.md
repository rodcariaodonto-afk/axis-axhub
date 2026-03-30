

## Corrigir Botão Desabilitado + Adicionar Campos de Pagamento nos Pedidos

### Problema do botão
O botão "Criar Pedido" fica desabilitado porque a condição exige `items.length > 0` — o usuário precisa clicar no "+" para adicionar o produto à lista antes. O produto selecionado no dropdown não conta como item adicionado. Vamos melhorar a UX para deixar isso mais claro.

### O que será feito

**1. Migração SQL** — Adicionar 2 colunas na tabela `orders`:
- `payment_method` (text, default `'pix'`) — Método de pagamento
- `installments` (integer, default `1`) — Número de parcelas

**2. Campos de pagamento no formulário** (`src/pages/Orders.tsx`):
- **Forma de Pagamento** — Select com opções: PIX, Cartão de Crédito, Cartão de Débito, Boleto, Transferência, Dinheiro
- **Parcelas** — Select com 1x a 12x (visível apenas quando método = Cartão de Crédito)
- **Condição** — Badge automática: "À Vista" (1x ou PIX/Débito/Dinheiro) ou "Parcelado Nx"
- Salvar `payment_method` e `installments` no insert

**3. Melhoria de UX do botão**:
- Tornar mais claro que o item precisa ser adicionado via "+"
- Mostrar coluna "Forma Pgto" na tabela de listagem

### Arquivos modificados
- Migração SQL (1 migration)
- `src/pages/Orders.tsx` — campos de pagamento + UX do botão + coluna na listagem

