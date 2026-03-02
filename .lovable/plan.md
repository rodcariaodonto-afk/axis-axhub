

# Plano: Node "Aguardar Resposta WhatsApp" no Workflow Builder

## Contexto
O sistema de Funis ja possui logica de `aguardar_resposta` integrada ao webhook do WhatsApp. O Workflow Builder precisa da mesma capacidade para permitir fluxos conversacionais completos.

## Arquitetura

O workflow-runner atualmente executa todos os nodes de forma sincrona em uma unica chamada. Para suportar "aguardar resposta", precisamos:

1. Pausar a execucao ao encontrar o node `wait_for_whatsapp_reply`
2. Salvar o estado (qual node retomar, telefone, sessao)
3. Quando o webhook receber mensagem inbound, verificar se ha workflows pausados para aquele telefone e retomar a execucao

```text
[Enviar msg] --> [Aguardar resposta] --> (pausa, status="waiting")
                                              |
                    webhook recebe msg -------+
                                              |
                                    (retoma execucao dos nodes seguintes)
```

## Alteracoes

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `src/components/workflows/workflowCatalog.ts` | Editar | Adicionar nodes `wait_for_whatsapp_reply` e `whatsapp_reply_contains` |
| Migracao SQL | Criar | Tabela `workflow_waiting_states` para persistir execucoes pausadas |
| `supabase/functions/workflow-runner/index.ts` | Editar | Tratar node `wait_for_whatsapp_reply` pausando execucao e salvando estado |
| `supabase/functions/whatsapp-evolution-webhook/index.ts` | Editar | Ao receber msg inbound, verificar workflows pausados e retomar execucao |

## Detalhes

### 1. Novos Nodes no Catalogo

| ID | Tipo | Label | Campos |
|----|------|-------|--------|
| `wait_for_whatsapp_reply` | action | Aguardar resposta WhatsApp | Sessao, Telefone, Timeout (minutos, opcional) |
| `whatsapp_reply_contains` | condition | Resposta contém | Texto a verificar |

O node `whatsapp_reply_contains` permite criar ramificacoes baseadas no conteudo da resposta recebida (ex: usuario respondeu "sim" vs "nao").

### 2. Tabela `workflow_waiting_states`

```text
id               UUID PK
tenant_id        UUID NOT NULL
execution_id     UUID FK workflow_executions
workflow_id      UUID FK workflows
node_id          TEXT (id do node que pausou)
session_id       UUID (sessao WhatsApp)
phone            TEXT (telefone aguardando resposta)
next_node_index  INT (posicao para retomar)
remaining_nodes  JSONB (nodes restantes para executar)
created_at       TIMESTAMPTZ
expires_at       TIMESTAMPTZ (timeout opcional)
status           TEXT DEFAULT 'waiting' (waiting | resumed | expired)
```

RLS: somente service_role acessa (usado apenas por edge functions).

### 3. workflow-runner: Logica de Pausa

Ao encontrar `wait_for_whatsapp_reply`:
- Salvar registro em `workflow_waiting_states` com os nodes restantes
- Atualizar `workflow_executions.status` para `"waiting"`
- Registrar step como `"waiting"`
- Retornar resposta indicando que o workflow esta pausado

Ao ser chamado para retomar (com `resume_execution_id`):
- Carregar estado da tabela `workflow_waiting_states`
- Injetar a resposta recebida no `trigger_data` como `{{whatsapp_reply}}`
- Continuar execucao dos nodes restantes

### 4. Webhook: Verificar Workflows Pausados

No bloco de mensagens inbound do `whatsapp-evolution-webhook`, apos a logica de funis existente:
- Consultar `workflow_waiting_states` com `status='waiting'` e `phone` correspondente
- Para cada match, chamar `workflow-runner` com `resume_execution_id`
- Marcar estado como `"resumed"`

### 5. Tratamento do `send_whatsapp_message` no Runner

Atualmente o runner nao executa envio real de WhatsApp (nao tem case para `send_whatsapp_message`/`send_whatsapp_text`). Sera adicionado o case que chama a edge function `send-whatsapp-message` internamente para que o fluxo completo funcione (enviar -> aguardar -> processar resposta).

