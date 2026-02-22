

# Correcao do WhatsApp - Webhook e Sincronizacao

## Problema Raiz

A funcao `create-whatsapp-session` cria a instancia na Evolution API mas **nao configura o webhook URL**. A Evolution API nao sabe para onde enviar eventos, entao:
- O status nunca muda de `qr_pending` para `connected`
- O dialog do QR Code nao fecha automaticamente
- Contatos e mensagens nunca sao recebidos

## Correcoes Necessarias

### 1. Edge Function `create-whatsapp-session` - Configurar Webhook

Apos criar a instancia, fazer um segundo POST para `{evolutionUrl}/webhook/set/{instanceName}` configurando:

```text
{
  "url": "https://dgybxarkvmaajfeesqdv.supabase.co/functions/v1/whatsapp-evolution-webhook",
  "webhook_by_events": false,
  "webhook_base64": true,
  "events": [
    "QRCODE_UPDATED",
    "CONNECTION_UPDATE", 
    "MESSAGES_UPSERT"
  ]
}
```

Isso garante que a Evolution API envie eventos para o nosso webhook.

### 2. Edge Function `whatsapp-evolution-webhook` - Melhorar Parsing

A Evolution API v2 envia o payload em formatos ligeiramente diferentes. Precisamos:
- Aceitar `event` tambem como `body.event` ou `body.apikey` (v2 format)
- Tratar `instance` como string ou como objeto `{ instanceName: "..." }`
- Logar o payload recebido para facilitar debug
- Tratar `connection.update` com `state` que pode vir como `data.state` ou `data.instance?.state`

### 3. Frontend `WhatsApp.tsx` - Melhorar Polling e Status

- O polling ja existe (a cada 5s), mas precisa atualizar a lista de sessoes alem do qrSession
- Quando o status mudar para `connected`, forcar reload de contacts
- Adicionar badge de status visual na sessao ("Conectado" verde vs "QR Code" amarelo)

### 4. Sessao Existente - Corrigir Status Manualmente

Como a sessao "Vendas" ja esta conectada na Evolution mas presa como `qr_pending` no banco, precisamos:
- Adicionar um botao "Verificar Status" na sessao que chama a Evolution API para checar o status real
- Ou criar uma funcao `get-whatsapp-qr` que tambem verifica e sincroniza o status

### 5. Edge Function `get-whatsapp-qr` - Sincronizar Status

Atualizar para que alem de buscar o QR, tambem verifique o status da instancia na Evolution e atualize o banco. Se ja estiver conectada, atualizar para `connected`.

## Arquivos Modificados

- `supabase/functions/create-whatsapp-session/index.ts` - Adicionar configuracao do webhook apos criar instancia
- `supabase/functions/whatsapp-evolution-webhook/index.ts` - Melhorar parsing do payload e adicionar logs
- `supabase/functions/get-whatsapp-qr/index.ts` - Sincronizar status da instancia
- `src/pages/WhatsApp.tsx` - Melhorar logica de polling e recarregar contatos apos conexao
- `src/components/whatsapp/WhatsAppSessionList.tsx` - Badge de status visual

## Ordem de Execucao

1. Corrigir `create-whatsapp-session` para configurar webhook
2. Melhorar `whatsapp-evolution-webhook` com logs e parsing robusto
3. Atualizar `get-whatsapp-qr` para sincronizar status
4. Ajustar frontend para reagir a mudancas de status
5. Testar recriando a sessao ou verificando status da existente

