

# Correcao: Mensagens do Funil Nao Sao Enviadas

## Problemas Identificados

Investigando o banco de dados, encontrei **3 problemas criticos** no motor de execucao do funil:

### 1. Tipo de bloco "enviar_texto" nao reconhecido
O frontend cria blocos com tipo `enviar_texto`, mas a funcao `process-funnel-block` so reconhece `enviar_mensagem`. O bloco cai no `default` do switch e registra apenas "Block type enviar_texto processed" -- **sem enviar nenhuma mensagem**.

Evidencia no banco:
```
bloco_tipo: enviar_texto
detalhes: { message: "Block type enviar_texto processed" }
```

### 2. Tipo de bloco "fim" nao reconhecido
O frontend usa o tipo `fim` para o bloco de encerramento, mas o codigo so reconhece `fim_fluxo`. Por isso as execucoes nunca sao marcadas como "concluido".

### 3. Sem session_id para envio
O bloco `enviar_texto` tem a mensagem configurada, mas **nao tem `session_id`** no config. A campanha tem o `session_id`, mas esse dado nao e passado para o funil. Sem sessao, o motor nao sabe por qual WhatsApp enviar.

## Solucao

### 1. Migrar tabela `funis_execucoes` -- adicionar `session_id`
Adicionar coluna `session_id` para que o funil saiba qual sessao WhatsApp usar quando iniciado por uma campanha.

```sql
ALTER TABLE public.funis_execucoes
  ADD COLUMN IF NOT EXISTS session_id uuid;
```

### 2. Atualizar `start-funnel-execution`
Aceitar `session_id` como parametro e salvar na execucao.

### 3. Atualizar `send-campaign-with-delay`
Passar o `session_id` da campanha ao iniciar a execucao do funil.

### 4. Atualizar `process-funnel-block`
- Adicionar case `enviar_texto` com a mesma logica de `enviar_mensagem`, buscando o `session_id` do registro de execucao caso nao esteja no config do bloco.
- Adicionar case `fim` mapeando para a mesma logica de `fim_fluxo`.
- Adicionar logging mais detalhado para depuracao.

### 5. Corrigir execucoes existentes (manual)
Atualizar as 3 execucoes travadas em "em_andamento" para "erro" para limpar o dashboard.

## Resumo Tecnico

| Mudanca | Arquivo/Recurso | Tipo |
|---|---|---|
| Adicionar coluna `session_id` | Migracao SQL | Banco de dados |
| Aceitar `session_id` | `start-funnel-execution/index.ts` | Edge Function |
| Passar `session_id` da campanha | `send-campaign-with-delay/index.ts` | Edge Function |
| Reconhecer `enviar_texto` e `fim` | `process-funnel-block/index.ts` | Edge Function |
| Limpar execucoes travadas | Query SQL | Banco de dados |

