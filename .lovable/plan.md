

# Correções e Features - Documento de Feedback

## Analise do Documento vs. Codebase Atual

O documento lista 8 bugs e 3 features. Apos analise detalhada do codigo existente, muitos itens ja estao implementados ou nao se aplicam. Abaixo esta o que realmente precisa ser feito:

### Itens JA RESOLVIDOS (nao precisam de acao)
- **BUG #1 (RLS custom fields)**: A tabela `product_custom_fields` ja tem RLS com `tenant_id = get_user_tenant_id()` corretamente configurada
- **BUG #3/4 (Importacao de Leads)**: Ja implementado com importacao CSV, export, deduplicacao e scoring em `Leads.tsx`
- **BUG #7/8 (RLS sales_cadences)**: Ja tem RLS com tenant isolation correta

### Itens que PRECISAM ser corrigidos

---

## Correcao 1: Descricao do Produto nao aparece na edicao (BUG #2)

**Problema**: A interface `Product` nao inclui `description`, o formulario de edicao nao carrega nem salva a descricao.

**Solucao**:
- Adicionar `description` na interface `Product`
- Adicionar campo `description` no `editForm` state
- Incluir `description` no `handleEdit` ao preencher formulario
- Incluir `description` no `handleEditSave` ao salvar
- Adicionar campo Textarea de descricao no dialog de edicao

**Arquivo**: `src/pages/Products.tsx`

---

## Correcao 2: Editar Contato (BUG #5)

**Problema**: A pagina de Contatos so permite criar, nao editar.

**Solucao**:
- Adicionar estado de edicao (`editingContact`, `editDialogOpen`)
- Criar formulario de edicao em dialog
- Adicionar botoes de editar e excluir em cada linha da tabela
- Funcao para carregar dados do contato no formulario e salvar alteracoes

**Arquivo**: `src/pages/Contacts.tsx`

---

## Correcao 3: Converter Contato em Cliente (BUG #6)

**Problema**: Nao ha opcao de transformar contato em cliente (tabela `customers`).

**Solucao**:
- Adicionar botao "Converter em Cliente" na tabela de contatos
- Criar dialog de conversao com campos: nome, documento (CPF/CNPJ), email, telefone, endereco
- Ao converter, criar registro na tabela `customers` com os dados do contato
- Os dados pre-existentes do contato (nome, email, phone) serao pre-preenchidos

**Arquivo**: `src/pages/Contacts.tsx`

---

## Feature 1: Templates de Mensagens

**Problema**: Nao ha painel para gerenciar templates de mensagens por canal (WhatsApp, Email, SMS).

**Solucao**: Nao sera necessario criar nova tabela pois ja existe `email_templates` com campos `name`, `subject`, `body`, `variables`. Vou:
- Adicionar uma nova secao "Templates" no menu de Configuracoes (`SettingsLayout.tsx`)
- Criar componente `MessageTemplatesPanel.tsx` que lista/cria/edita/deleta templates da tabela `email_templates`
- Adicionar filtro por canal e preview de variaveis

**Arquivos**: `src/pages/settings/SettingsLayout.tsx`, `src/pages/settings/MessageTemplatesSettings.tsx`, `src/pages/Settings.tsx`

---

## Feature 2: Editar Titulo de Colunas do Kanban

**Problema**: As colunas do Kanban (pipeline stages) nao podem ter seus titulos editados inline.

**Solucao**:
- Adicionar funcionalidade de duplo-clique no titulo da coluna para editar inline
- Salvar alteracao na tabela `pipeline_stages`

**Arquivo**: `src/components/kanban/KanbanColumn.tsx`

---

## Detalhes Tecnicos

**Arquivos modificados**:
- `src/pages/Products.tsx` - Adicionar description no edit
- `src/pages/Contacts.tsx` - Adicionar edicao e conversao em cliente
- `src/components/kanban/KanbanColumn.tsx` - Editar titulo inline
- `src/pages/settings/SettingsLayout.tsx` - Nova secao Templates
- `src/pages/Settings.tsx` - Renderizar nova secao

**Arquivos novos**:
- `src/pages/settings/MessageTemplatesSettings.tsx` - Painel de templates

**Sem alteracoes de banco de dados** - Todas as tabelas e RLS ja existem corretamente.

