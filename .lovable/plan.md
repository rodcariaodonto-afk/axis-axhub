

# Funcionalidades Criticas + Webhooks N8N

## Resumo

Tres blocos de trabalho:

1. **Importacao/Exportacao CSV** - Importar leads via CSV e exportar leads/deals para CSV
2. **Deduplicacao + Lead Scoring Automatico** - Detectar leads duplicados por email/telefone e aplicar regras de scoring configuraveis
3. **Edge Function de Dispatch N8N + 16 Eventos** - Criar edge function que processa event_outbox e emitir eventos em todos os pontos criticos do CRM

---

## 1. Importacao CSV de Leads

**Arquivo modificado:** `src/pages/Leads.tsx`

- Botao "Importar CSV" ao lado de "Novo Lead"
- Dialog com upload de arquivo CSV (input type="file" accept=".csv")
- Parse do CSV no frontend usando logica nativa (split por linhas e virgulas)
- Tela de mapeamento de colunas: o usuario seleciona qual coluna do CSV corresponde a name, email, phone, source, tags
- Preview das primeiras 5 linhas antes de confirmar
- Ao confirmar, inserir leads em lote via supabase insert (batch de 50)
- Validacao: ignorar linhas sem nome, validar formato de email
- Toast com contagem de leads importados vs ignorados

**Exportacao CSV (leads e deals):**

- Botao "Exportar CSV" na tela de Leads
- Gera arquivo CSV no frontend com as colunas: nome, email, telefone, fonte, score, status, criado_em
- Download automatico via `URL.createObjectURL` + link click
- Mesmo padrao na tela de Pipeline para exportar deals (nome, valor, estagio, status, data_prevista)

---

## 2. Deduplicacao Automatica de Leads

**Arquivo modificado:** `src/pages/Leads.tsx`

- Botao "Verificar Duplicados" na barra de acoes
- Ao clicar, busca todos os leads e agrupa por email ou telefone
- Dialog mostrando grupos de duplicados encontrados
- Para cada grupo: mostrar os leads duplicados lado a lado
- Botao "Mesclar" que mantem o lead mais antigo e transfere dados faltantes do mais novo
- Ao mesclar: atualizar deals/activities que referenciam o lead excluido, depois deletar o duplicado
- Toast com contagem de leads mesclados

---

## 3. Lead Scoring Automatico com Regras Configuraveis

**Arquivo modificado:** `src/pages/Leads.tsx`

- Botao "Regras de Score" que abre dialog de configuracao
- CRUD de regras usando tabela `lead_scoring_rules` (ja existe)
- Cada regra tem: criteria (texto descritivo como "source=website", "has_email", "has_phone"), points (inteiro), is_active (boolean)
- Regras pre-definidas sugeridas:
  - `has_email` = +10 pontos
  - `has_phone` = +10 pontos
  - `source=website` = +20 pontos
  - `source=referral` = +15 pontos
  - `status=contacted` = +5 pontos
  - `status=qualified` = +25 pontos
- Botao "Recalcular Scores" que aplica todas as regras ativas a todos os leads
- A logica de scoring roda no frontend: para cada lead, soma pontos das regras que se aplicam
- Atualiza score de cada lead via batch update

---

## 4. Edge Function de Dispatch N8N

**Novo arquivo:** `supabase/functions/dispatch-events/index.ts`

- Edge function que processa eventos pendentes na tabela `event_outbox`
- Busca eventos com `status = 'pending'` e `retry_count < 5`
- Para cada evento, envia POST para URL configuravel (secret `N8N_WEBHOOK_URL`)
- Headers: `Content-Type: application/json`, `X-Tenant-ID: {tenant_id}`, `Authorization: Bearer {N8N_TOKEN}` (secret)
- Payload padronizado: `{ event: event_name, timestamp, tenant_id, actor_user_id, data: payload }`
- Se sucesso (2xx): atualiza status para `processed`, seta `processed_at`
- Se falha: incrementa `retry_count`, mantem `pending`
- Apos 5 tentativas: muda status para `failed`

**Emissao dos 16 eventos no frontend:**

Criar helper `src/lib/emitEvent.ts`:

```text
async function emitEvent(eventName: string, payload: Record<string, any>)
  - Busca tenant_id e user_id do profile
  - Insere em event_outbox: { tenant_id, event_name, payload, actor_user_id }
```

Pontos de emissao (arquivos modificados):

| Evento | Arquivo | Momento |
|--------|---------|---------|
| `lead.created` | Leads.tsx | Apos insert de lead |
| `lead.scored` | Leads.tsx | Apos recalcular scores |
| `lead.status_changed` | Leads.tsx | Apos converter lead (status -> converted) |
| `deal.created` | Pipeline.tsx | Apos insert de deal |
| `deal.stage_changed` | Pipeline.tsx / DealDetail.tsx | Apos drag-drop ou changeStage |
| `deal.won` | DealDetail.tsx | Apos markWon |
| `deal.lost` | DealDetail.tsx | Apos markLost |
| `activity.created` | Activities.tsx / DealDetail.tsx | Apos insert de atividade |
| `activity.completed` | Activities.tsx / DealDetail.tsx | Apos marcar done_at |
| `proposal.created` | Proposals.tsx | Apos insert de proposta |
| `proposal.sent` | Proposals.tsx | Apos mudar status para sent |
| `proposal.approved` | Proposals.tsx | Apos mudar status para accepted |
| `proposal.rejected` | Proposals.tsx | Apos mudar status para rejected |
| `message.inbound` | (preparado na funcao, disparado via N8N) | Quando mensagem inbound chega |
| `cadence.started` | Cadences.tsx | Apos ativar cadencia |
| `cadence.completed` | Cadences.tsx | Apos desativar cadencia |

---

## Detalhes Tecnicos

### Novo arquivo: `src/lib/emitEvent.ts`

Helper reutilizavel que todas as paginas importam para registrar eventos no event_outbox.

### Novo arquivo: `supabase/functions/dispatch-events/index.ts`

Edge function com:
- CORS headers padrao
- Busca batch de ate 20 eventos pendentes
- Loop de envio com try/catch individual
- Retry com backoff (retry_count usado para controle)
- Secrets necessarios: `N8N_WEBHOOK_URL` e `N8N_TOKEN`

### Atualizacao do `supabase/config.toml`

Adicionar configuracao da nova edge function com `verify_jwt = false` (sera chamada por cron/scheduler externo).

### Arquivos modificados

| Arquivo | Mudancas |
|---------|----------|
| `src/pages/Leads.tsx` | Importar CSV, exportar CSV, deduplicacao, scoring, emitir eventos |
| `src/pages/Pipeline.tsx` | Exportar CSV, emitir deal.created e deal.stage_changed |
| `src/pages/DealDetail.tsx` | Emitir deal.won, deal.lost, deal.stage_changed, activity.created/completed |
| `src/pages/Activities.tsx` | Emitir activity.created e activity.completed |
| `src/pages/Proposals.tsx` | Emitir proposal.created, proposal.sent, proposal.approved, proposal.rejected |
| `src/pages/Cadences.tsx` | Emitir cadence.started e cadence.completed |
| `src/lib/emitEvent.ts` | Novo - helper de emissao de eventos |
| `supabase/functions/dispatch-events/index.ts` | Novo - edge function de dispatch |

### Ordem de implementacao

1. Helper `emitEvent.ts`
2. Edge function `dispatch-events`
3. Leads.tsx (CSV import/export + deduplicacao + scoring + eventos)
4. Pipeline.tsx (export + eventos)
5. DealDetail.tsx (eventos)
6. Activities.tsx (eventos)
7. Proposals.tsx (eventos)
8. Cadences.tsx (eventos)

### Secrets necessarios

Sera solicitado ao usuario configurar:
- `N8N_WEBHOOK_URL` - URL do webhook N8N
- `N8N_TOKEN` - Token de autenticacao para o N8N

Porem a edge function funcionara sem erro mesmo sem estes secrets (simplesmente nao enviara se nao configurados). Os eventos ficam registrados no event_outbox para processamento futuro.

