

# Implementar Activities Completo (Nivel Salesforce)

## Analise: O Que Ja Existe vs. O Que Falta

### Tabela `activities` - Situacao Atual

A tabela existe mas esta muito simplificada. Precisa de uma reestruturacao significativa.

| Coluna PDF | Coluna Atual | Status |
|---|---|---|
| subject (VARCHAR 255) | title | Renomear/adaptar |
| activity_type (VARCHAR 50) | type | Renomear/adaptar |
| description | description | Existe |
| status (Open/Completed/Cancelled) | done_at (timestamp) | **Falta** - hoje usa done_at como booleano |
| priority (Low/Normal/High/Urgent) | -- | **Falta** |
| due_date | due_at | Existe (renomear) |
| completed_date | done_at | Existe (manter) |
| account_id (FK crm_accounts) | -- | **Falta** |
| contact_id | contact_id | Existe |
| opportunity_id (FK opportunities) | -- | **Falta** |
| contract_id (FK contracts) | -- | **Falta** |
| assigned_to_id | owner_user_id | Existe (renomear conceitual) |
| created_by_id | -- | **Falta** |
| is_active | -- | **Falta** |
| updated_at | -- | **Falta** |
| deal_id | deal_id | Existe (extra, manter) |
| lead_id | lead_id | Existe (extra, manter) |

### Tabelas e Funcionalidades Faltando

| Item | Status |
|---|---|
| Tabela `activity_types` (tipos customizaveis) | **Falta** |
| Colunas novas na `activities` | **Falta** (status, priority, account_id, opportunity_id, contract_id, created_by_id, is_active, updated_at) |
| Indexes de performance | **Falta** |
| Pagina de Detalhes da Atividade | **Falta** |
| Visualizacao em Agenda/Calendario | **Falta** |
| Filtros avancados (tipo, status, prioridade, atribuido, data range) | **Falta** - hoje so tem pendente/concluida/todas |
| Resumo de Atividades (sidebar cards) | **Falta** |
| Paginacao (15/pagina) | **Falta** |
| Status de vencimento com cores | **Falta** |
| Modal Editar Atividade | **Falta** |
| Validacao "pelo menos 1 parent" | **Falta** |
| Soft delete (is_active) | **Falta** |
| Aba Atividades em AccountDetail | Parcialmente existe (busca por deal_id, nao por account_id) |
| Aba Atividades em ContractDetail | **Falta** |
| Aba Atividades em OpportunityDetail | **Falta** |

---

## Plano de Implementacao

### Fase 1: Migracao de Banco

**1.1 Adicionar colunas a `activities`:**
- `status` (VARCHAR 50, default 'Open') -- Open, Completed, Cancelled
- `priority` (VARCHAR 20, default 'Normal') -- Low, Normal, High, Urgent
- `account_id` (UUID, FK crm_accounts, nullable)
- `opportunity_id` (UUID, FK opportunities, nullable)
- `contract_id` (UUID, FK contracts, nullable)
- `created_by_id` (UUID, nullable)
- `is_active` (BOOLEAN, default true)
- `updated_at` (TIMESTAMPTZ, default now())

**1.2 Criar tabela `activity_types`:**
- id, tenant_id, name, icon, color, is_active, created_at
- UNIQUE(tenant_id, name)
- RLS com tenant isolation via `get_user_tenant_id()`
- Tipos padrao serao criados sob demanda na UI

**1.3 Criar indexes de performance:**
- idx_activities_status, idx_activities_priority, idx_activities_account_id, idx_activities_opportunity_id, idx_activities_contract_id, idx_activities_is_active

**1.4 Trigger para updated_at automatico**

**1.5 Atualizar `handle_new_user()`** para criar tipos padrao de atividade para novos tenants (Call, Email, Meeting, Task, Note, WhatsApp)

### Fase 2: Sidebar

Mover "Atividades" para logo apos "Oportunidades" e antes de "Contatos":

```text
Dashboard CRM
Contas
Contratos
Oportunidades
Atividades  <-- MOVER AQUI
Contatos
Leads
...
```

### Fase 3: Reescrever Listagem (`Activities.tsx`)

**3.1 Visualizacao em Lista (padrao):**
- Tabela com colunas: Tipo (icone+nome), Assunto (clicavel), Relacionado a, Status (badge), Prioridade (badge com cores), Data Vencimento (com cores de alerta), Atribuido a, Acoes
- Paginacao: 15 por pagina
- Soft delete (Desativar) em vez de excluir

**3.2 Visualizacao em Agenda (Calendario):**
- Toggle entre Lista e Calendario
- Calendario mensal com atividades nos dias correspondentes
- Cores por tipo de atividade
- Atividades vencidas em vermelho
- Clicar em dia mostra atividades desse dia

**3.3 Barra de Ferramentas:**
- Botao "Nova Atividade"
- Toggle Lista/Agenda
- Filtro por Tipo
- Filtro por Status (Open, Completed, Cancelled)
- Filtro por Prioridade (Low, Normal, High, Urgent)
- Filtro por Atribuido a
- Filtro por Data (range)
- Busca por assunto/descricao

**3.4 Resumo de Atividades (cards no topo):**
- Total Abertas
- Vencidas
- Hoje
- Esta Semana
- Concluidas (Este Mes)

**3.5 Modal "Nova Atividade":**
- Campos na ordem: Tipo (obrigatorio), Assunto (obrigatorio), Descricao, Relacionado a (pelo menos 1: Conta, Contato, Oportunidade ou Contrato), Status (default Open), Prioridade (default Normal), Data de Vencimento, Atribuido a (obrigatorio)
- Validacoes: assunto obrigatorio, pelo menos 1 parent, atribuido obrigatorio

**3.6 Modal "Editar Atividade":**
- Mesmos campos, pre-preenchidos
- Se mudar status para Completed: auto-preencher done_at
- Se mudar de Completed para Open: limpar done_at

### Fase 4: Pagina de Detalhes (`ActivityDetail.tsx`)

**4.1 Cabecalho:** Tipo (icone + nome) + Assunto + Status (badge) + Prioridade (badge)

**4.2 Botoes:** Editar, Marcar como Concluida, Desativar, Voltar

**4.3 Secoes:**
- Info Principal: Relacionado a (links clicaveis para Conta/Contato/Oportunidade/Contrato)
- Datas: Vencimento, Conclusao, Status de Vencimento (verde/amarelo/vermelho)
- Descricao: Texto completo
- Atribuido a / Criado por

### Fase 5: Integracoes com Detalhes

**5.1 AccountDetail.tsx:** Atualizar aba Atividades para buscar por `account_id` (hoje busca por deal_id)

**5.2 OpportunityDetail.tsx:** Adicionar aba Atividades com lista das 10 ultimas + botao "Nova Atividade" vinculada

**5.3 ContractDetail.tsx:** Adicionar aba Atividades com lista das 10 ultimas + botao "Nova Atividade" vinculada

### Fase 6: Rotas

- `/activities` - Listagem (ja existe)
- `/activities/:id` - Detalhes (novo)

---

## Arquivos a Criar/Modificar

| Arquivo | Acao |
|---|---|
| Migration SQL | Criar - colunas + tabela activity_types + indexes + trigger |
| `src/components/AppSidebar.tsx` | Modificar - reordenar "Atividades" no menu |
| `src/pages/Activities.tsx` | Reescrever - lista completa, calendario, filtros, resumo, modais |
| `src/pages/ActivityDetail.tsx` | Criar - detalhes + editar + acoes |
| `src/pages/AccountDetail.tsx` | Modificar - atualizar aba Atividades para usar account_id |
| `src/pages/OpportunityDetail.tsx` | Modificar - adicionar aba Atividades |
| `src/pages/ContractDetail.tsx` | Modificar - adicionar aba Atividades |
| `src/App.tsx` | Modificar - adicionar rota /activities/:id |

## Decisoes Tecnicas

- **Edge Functions:** NAO sera usado. O projeto inteiro usa Supabase client direto. Seguiremos o padrao.
- **Tipos padrao:** Criados sob demanda na UI (se nenhum tipo existir para o tenant, cria os 6 padrao automaticamente).
- **Constraint "pelo menos 1 parent":** Sera feito via validacao de trigger (nao CHECK) para compatibilidade com dados existentes que nao tem account_id/opportunity_id/contract_id.
- **Calendario:** Implementado com grid CSS simples, sem dependencia externa.
- **Dados existentes:** As colunas novas serao nullable ou com defaults para nao quebrar registros antigos. Atividades antigas sem `status` receberao 'Open' por default, e as com `done_at` preenchido receberao 'Completed' via UPDATE na migracao.

## Nota sobre WhatsApp e Notificacoes

A integracao automatica com WhatsApp (criar atividade ao receber mensagem) e notificacoes diarias de atividades vencidas mencionadas no PDF serao preparadas na estrutura (campos e tabelas), mas a implementacao completa requer integracao com o modulo WhatsApp existente e um sistema de cron jobs que ficara para proximo passo.

