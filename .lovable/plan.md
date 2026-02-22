
# Integracao Contas Bancarias com A Pagar, A Receber e Financeiro

## Problema Atual
As contas bancarias existem isoladas -- nao se conectam com os pagamentos e recebimentos. Quando um recebivel e marcado como "pago" ou uma despesa e quitada, o saldo bancario nao e atualizado e nenhuma transacao e registrada.

## Solucao

### 1. Banco de Dados
- Adicionar coluna `bank_account_id` (opcional) nas tabelas `receivables` e `payables` para vincular lancamentos a contas bancarias
- Criar funcao SQL `update_bank_balance_on_payment()` que, ao marcar como pago:
  - Cria um registro em `bank_transactions` vinculando ao receivable/payable
  - Atualiza o `balance` da conta bancaria (soma para recebimentos, subtrai para pagamentos)

### 2. Tela "A Receber" (Receivables)
- Ao clicar "Marcar como pago", abrir mini-dialog pedindo:
  - Conta bancaria de destino (select com as contas cadastradas)
  - Data do recebimento (default: hoje)
- Ao confirmar, o sistema:
  - Atualiza o status para "paid"
  - Insere transacao bancaria tipo "credit"
  - Incrementa o saldo da conta selecionada

### 3. Tela "A Pagar" (Payables)
- Mesmo fluxo: ao marcar como pago, selecionar conta bancaria de origem
- Insere transacao tipo "debit" e decrementa o saldo

### 4. Tela "Contas Bancarias" (BankAccounts)
- Ao clicar em uma conta, expandir/abrir detalhes com:
  - Extrato de transacoes (consulta `bank_transactions` filtrado por `account_id`)
  - Ultimas movimentacoes com tipo (credito/debito), descricao, valor e data
  - Indicador de reconciliacao
- Editar e excluir contas

### 5. Tela "Financeiro" (Finance)
- Ja busca o saldo bancario -- nenhuma mudanca necessaria, pois o saldo sera atualizado automaticamente via as operacoes acima

---

## Detalhes Tecnicos

### Migracao SQL
```text
ALTER TABLE receivables ADD COLUMN bank_account_id uuid REFERENCES bank_accounts(id);
ALTER TABLE payables ADD COLUMN bank_account_id uuid REFERENCES bank_accounts(id);
```

### Arquivos Modificados
- `src/pages/Receivables.tsx` -- dialog de confirmacao de pagamento com selecao de conta bancaria + logica de criar transacao e atualizar saldo
- `src/pages/Payables.tsx` -- mesmo fluxo para despesas
- `src/pages/BankAccounts.tsx` -- adicionar extrato de transacoes por conta, botoes editar/excluir conta

### Fluxo de Pagamento
1. Usuario clica "Marcar como pago"
2. Modal pede: qual conta bancaria? qual a data?
3. Sistema executa em sequencia:
   - `UPDATE receivables SET status='paid', paid_at=..., bank_account_id=...`
   - `INSERT INTO bank_transactions (account_id, type, description, amount, transaction_date, receivable_id/payable_id, ...)`
   - `UPDATE bank_accounts SET balance = balance +/- amount WHERE id = ...`
4. Saldo atualizado automaticamente em todas as telas
