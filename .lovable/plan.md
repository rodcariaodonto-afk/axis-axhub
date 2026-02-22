

# Kanban Profissional + Campanhas WhatsApp

## Contexto

O documento solicita 3 funcionalidades: Kanban profissional, Campanhas com delay, e Fluxo de recebimento automatico. O projeto ja possui um Pipeline basico com drag & drop na tabela `deals` e `pipeline_stages`, e uma pagina `DealDetail.tsx`.

A estrategia e: **melhorar o Pipeline existente** ao inves de criar tabelas novas do zero (como o documento sugere com `kanban_colunas`, `kanban_cards`, etc.), pois o projeto ja usa `deals` + `pipeline_stages` com tenant isolation. Criar tabelas paralelas seria redundante.

## Fase 1: Kanban Profissional (Melhorar Pipeline existente)

### 1.1 Adicionar campos faltantes na tabela `deals`

Campos novos:
- `descricao` (text) - Descricao do deal
- `observacoes` (text) - Observacoes/notas
- `probabilidade_percentual` (int, default 50) - Probabilidade individual do card
- `prioridade` (text, default 'normal') - baixa/normal/alta/urgente
- `tags` (text[], default '{}') - Array de tags
- `posicao_na_coluna` (int, default 0) - Ordem dentro da coluna

### 1.2 Criar tabela `deal_history` (historico de movimentacoes)

```text
deal_history
- id (uuid PK)
- tenant_id (uuid)
- deal_id (uuid)
- tipo_acao (text) - 'criado', 'movido', 'editado', 'deletado'
- coluna_origem_id (uuid, nullable)
- coluna_destino_id (uuid, nullable)
- campo_alterado (text, nullable)
- valor_anterior (text, nullable)
- valor_novo (text, nullable)
- usuario_id (uuid, nullable)
- comentario (text, nullable)
- created_at (timestamptz)
```

RLS: tenant isolation via `get_user_tenant_id()`.

### 1.3 Adicionar cor nas pipeline_stages

- `cor_hex` (varchar(7), default '#3B82F6') na tabela `pipeline_stages`

### 1.4 Reescrever `Pipeline.tsx` com Kanban profissional

- Cards com todos os campos novos (descricao, observacoes, valor, probabilidade, prioridade, tags)
- Drag & drop nativo (HTML5 API, ja usado no projeto - sem dependencia nova)
- Filtros avancados (busca, prioridade, responsavel)
- Total de valor por coluna
- Cores por coluna
- Badges de prioridade coloridas
- Contagem de cards por coluna

### 1.5 Reescrever `DealDetail.tsx` como modal/dialog

- Modal completo ao clicar no card (em vez de navegar para outra pagina)
- Campos editaveis: titulo, descricao, observacoes, valor, probabilidade, data fechamento, prioridade, tags
- Aba de historico de movimentacoes
- Botoes: Salvar, Cancelar, Deletar
- Manter compatibilidade com a rota `/deals/:id` existente

## Fase 2: Campanhas com Delay

### 2.1 Criar tabelas de campanhas

```text
campanhas
- id (uuid PK)
- tenant_id (uuid)
- nome (text)
- descricao (text, nullable)
- status (text, default 'rascunho') - rascunho/ativa/pausada/concluida
- mensagem_template (text)
- session_id (uuid, FK whatsapp_sessions) - sessao WhatsApp para envio
- created_at, updated_at

campanhas_configuracoes
- id (uuid PK)
- tenant_id (uuid)
- campanha_id (uuid FK)
- delay_minimo_segundos (int, default 2)
- delay_maximo_segundos (int, default 5)
- usar_sequencia_aleatoria (bool, default true)
- nao_disparar_sabados (bool, default false)
- nao_disparar_domingos (bool, default false)
- nao_disparar_feriados (bool, default true)
- hora_inicio_disparo (time, default '08:00')
- hora_fim_disparo (time, default '20:00')

campanhas_contatos
- id (uuid PK)
- tenant_id (uuid)
- campanha_id (uuid FK)
- telefone (text)
- nome (text, nullable)
- status (text, default 'pendente')
- enviado_em (timestamptz, nullable)
- erro_mensagem (text, nullable)
- tempo_espera_segundos (int, nullable)

campanhas_historico_envios
- id (uuid PK)
- tenant_id (uuid)
- campanha_id (uuid FK)
- contato_telefone (text)
- status (text) - pendente/enviado/entregue/lido/erro
- mensagem_texto (text)
- erro_mensagem (text, nullable)
- tempo_espera_segundos (int)
- enviado_em (timestamptz)
- created_at
```

Todas com RLS tenant isolation.

### 2.2 Edge Function: `send-campaign-with-delay`

- Recebe campanha_id, processa lista de contatos
- Valida horario de disparo e dias bloqueados
- Aplica delay aleatorio entre min/max
- Envia mensagem via Evolution API (reusando logica do `send-whatsapp-message`)
- Registra historico de envios

### 2.3 Pagina `Campanhas.tsx`

- Listagem de campanhas com status
- Criar/editar campanha (nome, template de mensagem, sessao WhatsApp)
- Importar contatos (manual ou da lista de contatos WhatsApp)
- Configuracoes de delay (componente CampaignSettings)
- Dashboard de envios (enviados, erros, pendentes)
- Botao para iniciar/pausar campanha

### 2.4 Rota e Sidebar

- Rota `/campanhas` no App.tsx
- Item "Campanhas" na sidebar em Comunicacao (ao lado de WhatsApp)

## Fase 3: Fluxo de Recebimento (Simplificado)

### 3.1 Tabela `fluxo_recebimento_logs`

Registra quando alguem responde a uma campanha:
- campanha_id, telefone, mensagem_recebida, status_fluxo, created_at

### 3.2 Integracao no webhook

No `whatsapp-evolution-webhook`, ao receber mensagem inbound:
- Verificar se o telefone esta em alguma campanha ativa
- Se sim, registrar no `fluxo_recebimento_logs`
- Marcar contato como "respondeu" na `campanhas_contatos`

## Arquivos a criar/modificar

| Arquivo | Acao |
|---------|------|
| Migracao SQL | Alterar `deals` + `pipeline_stages`, criar `deal_history`, criar tabelas de campanhas |
| `src/pages/Pipeline.tsx` | Reescrever com Kanban profissional |
| `src/pages/DealDetail.tsx` | Converter para modal reutilizavel |
| `src/components/kanban/KanbanCard.tsx` | Novo - card do kanban |
| `src/components/kanban/KanbanColumn.tsx` | Novo - coluna do kanban |
| `src/components/kanban/CardDetailModal.tsx` | Novo - modal de detalhes |
| `src/components/kanban/KanbanFilters.tsx` | Novo - filtros e busca |
| `src/pages/Campanhas.tsx` | Novo - gestao de campanhas |
| `src/components/campanhas/CampaignSettings.tsx` | Novo - config de delay |
| `src/components/campanhas/CampaignContactList.tsx` | Novo - lista de contatos |
| `src/components/campanhas/CampaignDashboard.tsx` | Novo - dashboard envios |
| `supabase/functions/send-campaign-with-delay/index.ts` | Novo - envio com delay |
| `src/components/AppSidebar.tsx` | Adicionar item Campanhas |
| `src/App.tsx` | Adicionar rota /campanhas |

## Ordem de implementacao

1. Migracao do banco (campos novos em deals, deal_history, pipeline_stages cor)
2. Kanban profissional (Pipeline.tsx + componentes)
3. Tabelas de campanhas (migracao)
4. Pagina de campanhas + componentes
5. Edge function de envio com delay
6. Integracao fluxo de recebimento no webhook

