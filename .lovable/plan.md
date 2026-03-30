

## Bloquear Criação Direta de Clientes — Obrigar Conta CRM

### Problema
Atualmente é possível criar clientes diretamente na página de Clientes (ERP), sem ter uma Conta no CRM. O fluxo correto deve ser: **Criar Conta no CRM → Converter em Cliente**.

### Solução

**`src/pages/Customers.tsx`** — 3 mudanças:

1. **Remover botão "Novo Cliente"** e todo o formulário de criação (Dialog de criação). Manter apenas o Dialog de **edição** (quando `editingId` existe)
2. **Substituir o botão por um alerta/guia**: No lugar do botão "Novo Cliente", colocar um botão que redireciona para a página de Contas (`/accounts`) com texto "Criar Conta no CRM" e um tooltip explicando o fluxo
3. **No estado vazio** (nenhum cliente), mostrar mensagem explicativa: "Para cadastrar um cliente, primeiro crie uma Conta no CRM e use o botão 'Converter em Cliente'." com link para `/accounts`

**Lógica preservada:**
- Edição de clientes existentes continua funcionando normalmente
- Exclusão com confirmação de senha continua funcionando
- Busca e listagem sem alterações
- O botão "Converter em Cliente" nas páginas Accounts.tsx, AccountDetail.tsx e Contacts.tsx continua sendo o único caminho para criar clientes

### Arquivo modificado
- `src/pages/Customers.tsx`

