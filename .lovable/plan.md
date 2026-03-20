

## Transferência entre Contas Bancárias

### O que será feito

Adicionar funcionalidade de transferência de valores entre contas bancárias com baixa automática nos saldos. A transferência cria 2 transações (débito na origem, crédito no destino) e atualiza os saldos de ambas as contas.

### Mudanças

**1. Migração SQL — Tabela `bank_transfers`**
- Campos: `id`, `tenant_id`, `from_account_id`, `to_account_id`, `amount`, `transfer_date`, `notes`, `created_at`
- RLS com `get_user_tenant_id()`
- Essa tabela serve como log/histórico de transferências

**2. Frontend — `src/pages/BankAccounts.tsx`**

- **Botão "Transferência"** ao lado de "Nova Conta" na listagem principal
- **Botão "Transferir"** ao lado do saldo no extrato de cada conta (pré-seleciona a conta de origem)
- **Modal de transferência** com:
  - Dropdown "Conta de Origem" (pré-selecionada quando aberto do extrato)
  - Dropdown "Conta de Destino" (filtra para não mostrar a mesma conta)
  - Campo "Valor" (numérico)
  - Campo "Data" (date picker)
  - Campo "Motivo / Observações" (textarea)
- **Ao confirmar**:
  1. Insere registro em `bank_transfers`
  2. Insere transação de **débito** na conta de origem (`bank_transactions`)
  3. Insere transação de **crédito** na conta de destino (`bank_transactions`)
  4. Atualiza `balance` de ambas as contas (`bank_accounts`)
  5. Recarrega dados

**3. Extrato — Identificação visual**
- Transações de transferência terão descrição como "Transferência para [conta]" / "Transferência de [conta]"
- No extrato, transferências aparecerão normalmente como crédito/débito

### Arquivos
- Migração SQL (tabela nova + RLS)
- `src/pages/BankAccounts.tsx` (modal + lógica de transferência)

