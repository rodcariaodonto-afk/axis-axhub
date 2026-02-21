

# Sistema de Workflows - Builder Visual

## Visao Geral

Criar um builder visual de workflows que permite ao usuario montar automacoes com triggers, acoes e condicoes. A definicao do workflow sera armazenada como JSONB (sem React Flow - complexo demais como dependencia). Sera um builder baseado em lista/cards arrastavel, similar ao N8N simplificado. A execucao real dos workflows sera delegada ao sistema de Event Outbox ja existente.

## Adaptacoes da spec ao projeto

- `workspace_id` sera `tenant_id` (padrao do projeto)
- Sem React Flow - builder baseado em lista sequencial de nos com UI de cards (mais leve, sem nova dependencia pesada)
- Sem Bull Queue/Redis - execucao sincrona via Edge Function `dispatch-events` ja existente
- Sem Node.js backend - tudo via Supabase client + Edge Functions
- Sem CHECK constraints - conforme guidelines do projeto
- `created_by` como UUID sem FK para auth.users (padrao do projeto)
- Definicao do workflow armazenada como JSONB no campo `definition` (nodes + edges inline)
- Tabelas `workflow_nodes` e `workflow_edges` nao serao criadas separadamente - ficam dentro do JSONB `definition` para simplicidade

## O que sera construido

### 1. Tabelas no banco de dados

**workflows** - Definicoes dos workflows
- id, tenant_id, name, description, definition (JSONB com nodes e edges), is_active, is_published, version, created_by, created_at, updated_at, published_at, total_executions, successful_executions, failed_executions

**workflow_executions** - Historico de execucoes
- id, workflow_id (FK), tenant_id, trigger_type, trigger_data (JSONB), status, result (JSONB), error_message, started_at, completed_at, duration_ms

**workflow_execution_steps** - Passos de cada execucao
- id, execution_id (FK), tenant_id, node_id, node_type, status, input_data (JSONB), output_data (JSONB), error_message, started_at, completed_at, duration_ms

RLS: isolamento por tenant_id. Realtime habilitado para workflow_executions.

### 2. Catalogo de Triggers e Acoes (constante frontend)

**Triggers (baseados nos eventos do Event Outbox existente):**
- lead.created, lead.updated, deal.won, deal.lost, deal.stage_changed, order.created, order.paid, customer.created, manual (execucao manual)

**Acoes:**
- Enviar notificacao in-app, Atualizar campo de lead, Mover deal de etapa, Criar atividade, Adicionar tag ao lead, Enviar webhook externo, Aguardar (delay placeholder), Criar tarefa

**Condicoes:**
- Campo igual a, Campo contem, Campo maior que, Campo vazio/nao vazio

### 3. Componentes React

**WorkflowList** - Lista de workflows com status, estatisticas e acoes (ativar/desativar, editar, excluir)
**WorkflowBuilder** - Builder sequencial com:
  - Painel de adicao de nos (triggers, acoes, condicoes)
  - Lista vertical de nos como cards conectados por setas
  - Configuracao inline de cada no (click para expandir)
  - Botoes salvar/publicar
**WorkflowNodeCard** - Card de cada no com icone, tipo, configuracao resumida, botao remover
**WorkflowExecutionList** - Lista de execucoes com status, duracao, filtros
**WorkflowExecutionDetail** - Visualizacao passo-a-passo de uma execucao

### 4. Pagina e rotas

- Nova pagina `src/pages/Workflows.tsx` com abas: Meus Workflows, Execucoes
- Rota `/workflows` no App.tsx
- Link "Workflows" na sidebar no grupo CRM (icone Zap ou GitBranch)

### 5. Edge Function para execucao

- Nova edge function `workflow-runner` que:
  1. Recebe workflow_id + trigger_data
  2. Carrega a definicao do workflow
  3. Percorre os nos sequencialmente
  4. Para cada no, executa a acao correspondente (inserir notificacao, atualizar registro, etc)
  5. Registra cada passo em workflow_execution_steps
  6. Atualiza status da execucao e contadores do workflow

## Detalhes Tecnicos

### Estrutura do JSONB `definition`

```text
{
  "nodes": [
    { "id": "trigger_1", "type": "trigger", "config": { "event": "lead.created" }, "position": 0 },
    { "id": "condition_1", "type": "condition", "config": { "field": "score", "operator": "gte", "value": 50 }, "position": 1 },
    { "id": "action_1", "type": "action", "config": { "action": "create_notification", "title": "Lead quente!" }, "position": 2 }
  ],
  "edges": [
    { "source": "trigger_1", "target": "condition_1" },
    { "source": "condition_1", "target": "action_1", "condition": "true" }
  ]
}
```

### Estrutura de arquivos

```text
src/components/workflows/
  workflowCatalog.ts          -- triggers, acoes, condicoes disponiveis
  WorkflowList.tsx
  WorkflowBuilder.tsx
  WorkflowNodeCard.tsx
  WorkflowExecutionList.tsx
  WorkflowExecutionDetail.tsx
src/pages/Workflows.tsx
supabase/functions/workflow-runner/index.ts
```

### Migracao SQL

```text
- CREATE TABLE workflows (com campos listados acima)
- CREATE TABLE workflow_executions (com campos listados acima)
- CREATE TABLE workflow_execution_steps (com campos listados acima)
- Indices em tenant_id, workflow_id, execution_id, status
- RLS policies com get_user_tenant_id()
- Trigger updated_at em workflows
- Realtime habilitado para workflow_executions
```

## Sequencia de implementacao

1. Criar migracao com 3 tabelas + RLS + indices + realtime
2. Criar catalogo de triggers/acoes/condicoes (workflowCatalog.ts)
3. Criar componentes React (WorkflowList, Builder, NodeCard, ExecutionList, ExecutionDetail)
4. Criar pagina Workflows.tsx com abas
5. Adicionar rota e link na sidebar
6. Criar edge function workflow-runner para execucao

