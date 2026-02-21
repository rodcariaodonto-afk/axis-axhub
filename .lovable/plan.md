
# Integracao Financeira + Edicao/Exclusao com Senha

## Problemas Identificados

### 1. Visao Geral Financeira nao reflete dados reais
- O card "Total a Receber" mostra apenas itens com status `pending`, mas o recebivel ja foi marcado como `paid` -- entao some do total
- O grafico de fluxo de caixa usa `due_date` como referencia, mas o unico recebivel tem `due_date: 2026-03-20` (marco), que esta fora do range dos ultimos 6 meses (set/25 a fev/26)
- Resultado: tudo aparece zerado na visao geral

### 2. Falta botoes de edicao e exclusao nos lancamentos
- Hoje so existe o botao "Marcar como pago" (CheckCircle)
- Nao ha como editar descricao, valor ou vencimento
- Nao ha como excluir um lancamento

### 3. Falta confirmacao de senha para acoes destrutivas
- Editar/excluir precisa pedir a senha de login do usuario antes de executar
- A acao deve ser registrada nos logs de auditoria

---

## Solucao

### A. Melhorar a pagina Finance.tsx (Visao Geral)

Reescrever os cards para mostrar informacoes mais completas:

- **Total a Receber (Pendente)**: soma dos receivables com status `pending` (manter)
- **Total a Pagar (Pendente)**: soma dos payables com status `pending` (manter)
- **Saldo Bancario**: soma dos bank_accounts (manter)
- Adicionar cards extras: **Total Recebido no Mes** e **Total Pago no Mes** (filtrando por `paid_at` no mes atual)

Corrigir o grafico de fluxo de caixa:
- Incluir o mes atual E o proximo mes no range (7 meses: 5 anteriores + atual + proximo)
- Usar `paid_at` para itens pagos e `due_date` para pendentes, dando uma visao real vs prevista

Adicionar tabela de **ultimos lancamentos** (5 mais recentes de receivables + payables combinados) para dar visibilidade imediata.

### B. Botoes de Editar e Excluir (Receivables.tsx e Payables.tsx)

Adicionar na coluna de acoes de cada linha da tabela:
- Icone de **lapis** (Edit) -- abre dialog de edicao com os campos preenchidos
- Icone de **lixeira** (Trash) -- abre dialog de confirmacao

Ambas as acoes usam o mesmo componente `PasswordConfirmDialog`.

### C. Componente PasswordConfirmDialog

Novo componente reutilizavel: `src/components/finance/PasswordConfirmDialog.tsx`

Funcionamento:
1. Quando usuario clica em Editar ou Excluir, abre um dialog pedindo a senha
2. O componente chama `supabase.auth.signInWithPassword()` com o email do usuario logado + senha digitada
3. Se a autenticacao for bem-sucedida, executa a acao (update ou delete)
4. Registra na tabela `audit_logs` um log com `entity: "receivable"` ou `"payable"`, `action: "update"` ou `"delete"`, e os dados `before_json` / `after_json`

### D. Registro de Auditoria

Cada edicao/exclusao grava automaticamente em `audit_logs`:
- `entity`: "receivable" ou "payable"
- `action`: "update" ou "delete"
- `entity_id`: ID do lancamento
- `before_json`: dados antes da alteracao
- `after_json`: dados apos a alteracao (null se delete)
- `actor_user_id`: ID do usuario autenticado

---

## Arquivos Alterados

| Arquivo | Acao |
|---------|------|
| `src/pages/Finance.tsx` | Reescrever para mostrar totais pagos, ultimos lancamentos, e corrigir range do grafico |
| `src/pages/Receivables.tsx` | Adicionar botoes editar/excluir com confirmacao de senha e audit log |
| `src/pages/Payables.tsx` | Adicionar botoes editar/excluir com confirmacao de senha e audit log |
| `src/components/finance/PasswordConfirmDialog.tsx` | **Novo** - Dialog reutilizavel de confirmacao por senha |

Nenhuma alteracao de banco de dados necessaria -- as tabelas `audit_logs`, `receivables` e `payables` ja existem com as colunas e RLS corretas.
