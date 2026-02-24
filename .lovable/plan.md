

# Ajustar Contacts para Exigir Account - O Que Falta

## Analise: Atual vs. Documento

| Requisito do PDF | Status Atual |
|---|---|
| Coluna `account_id` na tabela `contacts` | Ja existe (nullable) |
| Index em `account_id` | Falta criar |
| Campo "Conta" PRIMEIRO no formulario (antes do Nome) | Falta - hoje aparece por ultimo |
| Remover opcao "Nenhuma" do select de conta | Falta - hoje permite "Nenhuma" |
| Mensagem quando nao existem contas no workspace | Falta |
| Validacao obrigatoria no Edit tambem | Falta - edit permite account vazio |
| Nome da conta clicavel na tabela (link para /accounts/:id) | Falta |
| Coluna "Conta" como segunda coluna (apos Nome) | Ja existe mas esta na 5a posicao |

## Plano de Implementacao

### Fase 1: Migracao de Banco

Criar index de performance na coluna `account_id` da tabela `contacts` (a coluna ja existe, nao precisa recriar).

```text
CREATE INDEX IF NOT EXISTS idx_contacts_account_id ON public.contacts(account_id);
```

Nota: NAO vamos adicionar constraint NOT NULL pois ja existem contatos sem conta no banco. A validacao sera feita apenas na UI.

### Fase 2: Modificar `src/pages/Contacts.tsx`

**2.1 Reordenar formulario** - Campo "Conta" passa a ser o PRIMEIRO campo, antes de Nome/Sobrenome.

**2.2 Remover opcao "Nenhuma"** - O select de conta nao tera mais a opcao "Nenhuma". Placeholder sera "Selecione uma conta...".

**2.3 Mensagem de contas vazias** - Se `accounts.length === 0`, exibir aviso: "Voce precisa criar uma conta primeiro. Va para CRM > Contas" com link.

**2.4 Validacao no Edit** - Adicionar mesma validacao de `account_id` obrigatorio no `handleEditSave`.

**2.5 Reordenar colunas da tabela** - Coluna "Conta" passa para segunda posicao (apos Nome).

**2.6 Nome da conta clicavel** - Na coluna "Conta", o nome sera um link que navega para `/accounts/:id`.

**2.7 Contatos sem conta** - Exibir "Sem Conta" em vermelho para contatos que nao tem `account_id`.

### Arquivos a Modificar

| Arquivo | Acao |
|---|---|
| Migration SQL | Criar - index em contacts.account_id |
| `src/pages/Contacts.tsx` | Modificar - reordenar form, validacoes, tabela, links |

### O Que NAO Sera Feito

- Edge Functions (o projeto usa Supabase client direto, nao edge functions para CRUD)
- Constraint NOT NULL no banco (protege dados existentes)
- Pagina de detalhes do contato (nao existe ainda e nao sera criada neste escopo)

