

## Limpar Dados da Cleide + Adicionar Botão Deletar Pedido

### 1. Deletar recebíveis da cliente Cleide
Executar via ferramenta de inserção/deleção SQL:
```sql
DELETE FROM receivables WHERE customer_id IN (SELECT id FROM customers WHERE name ILIKE '%cleide%');
```

### 2. Adicionar opção "Excluir Pedido" no dropdown de ações (`src/pages/Orders.tsx`)

**Mudanças:**
- Adicionar função `deleteOrder` que:
  1. Deleta recebíveis associados (`receivables` WHERE `order_id`)
  2. Deleta pagamentos associados (`order_payments` WHERE `order_id`)
  3. Deleta itens do pedido (`order_items` WHERE `order_id`)
  4. Deleta o pedido em si (`orders`)
  5. Mostra toast de confirmação
- Adicionar `DropdownMenuItem` "Excluir Pedido" (com estilo destructive) no menu de ações de cada pedido, disponível em qualquer status
- Adicionar `PasswordConfirmDialog` para confirmar exclusão com senha

### Arquivos modificados
- Migração SQL (deleção dos recebíveis da Cleide — via insert tool)
- `src/pages/Orders.tsx` — botão de exclusão + lógica de cascade delete

