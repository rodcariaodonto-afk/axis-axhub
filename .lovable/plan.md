

# Implementar Opportunities (Oportunidades) - Pipeline de Vendas

## O Que Existe Hoje

- **Nenhuma** tabela `opportunities` ou `opportunity_stages` no banco
- **Nenhuma** pagina ou componente de Opportunities no frontend
- O projeto ja tem um Pipeline/Kanban para Deals, mas Opportunities e um modulo separado conforme o documento

## Adaptacoes ao Projeto

O documento referencia `workspace_id` e `users`, mas este projeto usa:
- `tenant_id` em vez de `workspace_id`
- `profiles` em vez de `users`
- `crm_accounts` em vez de `accounts`
- RLS com `get_user_tenant_id()` em vez de subquery em `users`

Todas as referencias serao adaptadas.

---

## Plano de Implementacao

### Fase 1: Migracao de Banco

**1.1 Criar tabela `opportunities`:**
- id (UUID PK), tenant_id, account_id (FK crm_accounts), name, description, stage (default 'Prospecting'), probability (decimal 0-1), amount, currency (default 'BRL'), expected_close_date, close_date, owner_id (UUID), contact_id (FK contacts), is_active (default true), created_at, updated_at
- Indexes compostos para performance
- RLS com tenant isolation via `get_user_tenant_id()`
- Trigger para updated_at

**1.2 Criar tabela `opportunity_stages`:**
- id, tenant_id, name, order_index, color, is_won, is_lost, created_at
- Unique(tenant_id, name)
- RLS com tenant isolation

**1.3 Inserir estagios padrao no `handle_new_user()`:**
- Adicionar criacao automatica dos 6 estagios padrao (Prospecting, Qualification, Proposal, Negotiation, Closed Won, Closed Lost) quando um novo tenant e criado

**1.4 Nota:** Para tenants existentes, os estagios serao criados sob demanda na UI (se nenhum estagio existir, cria os padrao automaticamente).

### Fase 2: Menu (Sidebar)

Adicionar "Oportunidades" no array `crmItems` apos "Contratos" e antes de "Contatos":

```text
Dashboard CRM
Contas
Contratos
Oportunidades  <-- NOVO
Contatos
Leads
...
```

### Fase 3: Pagina de Listagem (`Opportunities.tsx`)

**3.1 Visualizacao Kanban (padrao):**
- Colunas por estagio com cores customizadas
- Cards mostrando: nome, conta, valor, probabilidade, valor ponderado
- Drag-and-drop entre colunas (atualiza estagio)
- Ao mover para "Closed Won"/"Closed Lost": modal pedindo motivo + preenche close_date

**3.2 Visualizacao em Lista (tabela):**
- Toggle entre Kanban e Lista
- Colunas: Nome (clicavel), Conta (clicavel), Estagio (badge), Valor, Probabilidade, Valor Ponderado, Data Fechamento Esperada, Proprietario
- Paginacao (10/pagina)

**3.3 Barra de Ferramentas:**
- Botao "Nova Oportunidade"
- Toggle Kanban/Lista
- Filtro por Proprietario
- Filtro por Conta
- Filtro por Data (range)
- Busca por nome/conta

**3.4 Resumo de Vendas (cards no topo):**
- Total de Oportunidades
- Valor Total
- Valor Ponderado (amount x probability)
- Oportunidades Ganhas / Perdidas
- Taxa de Conversao

**3.5 Modal "Nova Oportunidade":**
- Campos na ordem: Conta (obrigatorio), Nome (obrigatorio), Descricao, Estagio (obrigatorio, default Prospecting), Probabilidade (0-100%), Valor, Moeda, Data Fechamento Esperada, Contato (filtrado pela conta selecionada), Proprietario (obrigatorio)
- Validacoes: probabilidade 0-100, valor positivo, campos obrigatorios

### Fase 4: Pagina de Detalhes (`OpportunityDetail.tsx`)

**4.1 Cabecalho:** Nome + Badge de Estagio + Botoes (Editar, Ganhar, Perder, Desativar, Voltar)

**4.2 Secoes:**
- Info Principal: Conta (clicavel), Contato (clicavel), Proprietario, Datas
- Financeiro: Valor, Probabilidade, Valor Ponderado, Moeda
- Datas: Fechamento Esperado, Fechamento Real, Dias ate Fechamento
- Descricao
- Abas: Atividades (vazio), Historico (vazio) - preparadas para futuro

**4.3 Modal Editar:**
- Mesmos campos da criacao, pre-preenchidos
- Se mudar para Closed Won/Lost: pedir motivo + auto-preencher close_date

### Fase 5: Rotas

- `/opportunities` - Listagem (Kanban + Lista)
- `/opportunities/:id` - Detalhes

---

## Arquivos a Criar/Modificar

| Arquivo | Acao |
|---|---|
| Migration SQL | Criar - tabelas + indexes + RLS + trigger |
| `src/components/AppSidebar.tsx` | Modificar - adicionar "Oportunidades" no menu CRM |
| `src/pages/Opportunities.tsx` | Criar - listagem Kanban + Lista + filtros + resumo |
| `src/pages/OpportunityDetail.tsx` | Criar - detalhes + editar + acoes |
| `src/App.tsx` | Modificar - adicionar rotas /opportunities e /opportunities/:id |

## Decisao: Edge Functions vs. Supabase Client

O documento sugere Edge Functions para CRUD, mas este projeto usa Supabase client direto (padrao consistente em todas as paginas). Seguiremos o padrao do projeto usando `supabase.from('opportunities')` diretamente, mantendo consistencia com Contracts, Contacts, Leads, etc.

## Nota sobre Estagios Padrao

Como nao existe um "workspace_id" fixo para inserir estagios padrao, eles serao criados automaticamente para cada tenant na primeira vez que acessar a pagina de Opportunities (se nenhum estagio existir).
