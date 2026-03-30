

## Pagamento Dividido (Split Payment) nos Pedidos

### Problema
O cliente pode pagar parte no cartão (parcelado) e parte no PIX. Atualmente só suporta uma forma de pagamento por pedido.

### Solução
Substituir os campos únicos `paymentMethod`/`installments` por uma **lista de formas de pagamento**, onde cada entrada tem: método, valor e parcelas.

### O que será feito

**1. Migração SQL** — Nova tabela `order_payments`:
- `id`, `tenant_id`, `order_id` (FK), `method` (text), `amount` (numeric), `installments` (integer default 1), `created_at`
- As colunas `payment_method` e `installments` na tabela `orders` continuam para compatibilidade, mas serão preenchidas com resumo

**2. UI no formulário de Novo Pedido** (`src/pages/Orders.tsx`):
- Substituir os selects únicos por uma seção "Formas de Pagamento" com botão "+ Adicionar Forma"
- Cada forma adicionada mostra: Método (dropdown), Valor (R$), Parcelas (se cartão crédito)
- Validação: soma dos valores das formas deve ser igual ao total do pedido
- Botão de remover em cada forma
- Mostrar saldo restante: "Falta alocar: R$ X.XXX,XX"

**3. Salvar no banco**:
- Inserir registros em `order_payments` para cada forma
- Campo `payment_method` na tabela `orders` preenchido com resumo (ex: "PIX + Cartão Créd. 10x")

**4. Listagem**:
- Coluna "Forma Pgto" mostra resumo concatenado das formas

### Interface da seção de pagamento
```text
Formas de Pagamento                    [+ Adicionar Forma]
┌─────────────────┬────────────┬──────────┬───┐
│ Cartão Crédito  │ R$ 10000   │ 10x      │ 🗑 │
│ PIX             │ R$ 10000   │ —        │ 🗑 │
└─────────────────┴────────────┴──────────┴───┘
                        Alocado: R$ 20.000,00 ✓
```

### Arquivos modificados
- Migração SQL (nova tabela `order_payments`)
- `src/pages/Orders.tsx` — seção de múltiplas formas de pagamento + validação + salvar

