

# WhatsApp Nativo na Plataforma AXHUB

Implementacao completa de um painel WhatsApp integrado ao AXHUB usando Evolution API, com gerenciamento de sessoes, QR Code, chat em tempo real e historico de mensagens.

## Visao Geral

O usuario acessa a aba "WhatsApp" no sidebar, cria uma sessao, escaneia o QR Code e passa a enviar/receber mensagens diretamente na plataforma. Tudo isolado por tenant.

## Fases de Implementacao

### Fase 1: Banco de Dados (4 tabelas)

Criar via migration as seguintes tabelas, todas com RLS por `tenant_id`:

1. **whatsapp_settings** - Configuracoes da Evolution API por tenant (URL, API Key, webhook, auto-reply)
2. **whatsapp_sessions** - Sessoes WhatsApp (status: disconnected/qr_pending/connected/error, QR code, instance ID)
3. **whatsapp_contacts** - Contatos sincronizados por sessao (telefone, nome, foto, ultima mensagem, nao-lidos)
4. **whatsapp_messages** - Mensagens enviadas/recebidas (texto, imagem, audio, video, documento, localizacao)

Habilitar realtime na tabela `whatsapp_messages` e `whatsapp_sessions` para atualizacoes em tempo real.

RLS: todas as tabelas usam `tenant_id = get_user_tenant_id()` (mesmo padrao do restante da plataforma). Configuracoes (settings) restritas a admins.

### Fase 2: Secrets (Evolution API)

Solicitar ao usuario dois segredos:
- **EVOLUTION_API_URL** - URL da instancia Evolution API
- **EVOLUTION_API_KEY** - Chave de acesso da Evolution API

### Fase 3: Edge Functions (4 funcoes)

1. **create-whatsapp-session** (POST) - Cria instancia na Evolution API e registra sessao no banco
2. **get-whatsapp-qr** (GET) - Busca QR Code da Evolution API para exibicao na tela
3. **send-whatsapp-message** (POST) - Envia mensagem via Evolution API e salva no banco
4. **whatsapp-evolution-webhook** (POST, sem JWT) - Recebe eventos da Evolution API:
   - `QRCODE_UPDATED` - Atualiza QR code na sessao
   - `CONNECTION_UPDATE` - Atualiza status de conexao
   - `MESSAGES_UPSERT` - Salva mensagens recebidas

Todas as funcoes (exceto webhook) validam autenticacao e tenant. O webhook identifica a sessao pelo `evolution_instance_id`.

### Fase 4: Frontend

**Novo arquivo: `src/pages/WhatsApp.tsx`**

Layout em 3 colunas (responsivo):
- **Coluna 1 (esquerda)**: Lista de sessoes + botao "Nova Sessao" + status de cada sessao (badge verde/vermelho/amarelo)
- **Coluna 2 (centro)**: Lista de contatos da sessao selecionada, com busca, contagem de nao-lidos e ultimo horario
- **Coluna 3 (direita)**: Chat com a conversa selecionada - bolhas de mensagem (inbound/outbound), campo de texto + botao enviar

**Dialog de QR Code**: Modal que exibe o QR code em base64, com refresh automatico a cada 5 segundos ate conectar.

**Dialog de Nova Sessao**: Input para nome da sessao + botao criar.

**Dialog de Configuracoes**: Formulario para salvar URL e API Key da Evolution API (acessivel apenas para admins, na propria pagina WhatsApp ou em Settings).

**Realtime**: Subscribe nas tabelas `whatsapp_messages` e `whatsapp_sessions` para atualizacao automatica sem polling.

### Fase 5: Integracao no App

- **App.tsx**: Adicionar rota `/whatsapp` protegida
- **AppSidebar.tsx**: Adicionar item "WhatsApp" com icone `MessageCircle` no grupo "CRM" ou em novo grupo "Comunicacao"

## Detalhes Tecnicos

### Estrutura das Tabelas

```text
whatsapp_settings
  - id, tenant_id, evolution_api_url, evolution_api_key
  - webhook_url, auto_reply_enabled, auto_reply_message, max_sessions

whatsapp_sessions
  - id, tenant_id, session_name, status, qr_code
  - evolution_instance_id, phone_number, last_connected_at, error_message

whatsapp_contacts
  - id, tenant_id, session_id (FK sessions), customer_id (FK customers, nullable)
  - phone_number, display_name, profile_picture_url
  - last_message_at, unread_count, is_favorite

whatsapp_messages
  - id, tenant_id, session_id (FK sessions), contact_id (FK contacts, nullable)
  - contact_phone, message_type, content, media_url, media_type
  - direction (inbound/outbound), status (sent/delivered/read/failed)
  - whatsapp_message_id, sender_name, sender_phone
```

### Edge Functions - Fluxo

```text
[Usuario cria sessao]
  -> create-whatsapp-session
    -> POST Evolution /instance/create
    -> INSERT whatsapp_sessions (status: qr_pending)

[Usuario clica "Conectar"]
  -> get-whatsapp-qr
    -> GET Evolution /instance/fetchInstances
    -> Retorna QR code base64

[Evolution envia evento]
  -> whatsapp-evolution-webhook
    -> QRCODE_UPDATED: UPDATE sessions.qr_code
    -> CONNECTION_UPDATE: UPDATE sessions.status
    -> MESSAGES_UPSERT: INSERT whatsapp_messages + UPSERT contacts

[Usuario envia mensagem]
  -> send-whatsapp-message
    -> POST Evolution /message/sendText
    -> INSERT whatsapp_messages (direction: outbound)
```

### Adaptacoes ao AXHUB

- Usa `tenant_id` + `get_user_tenant_id()` em vez de `workspace_id`
- FK `customer_id` referencia tabela `customers` existente (vinculo opcional)
- Validacao de admin via `has_role()` para configuracoes
- Segue o mesmo padrao visual (dark theme, shadcn/ui, Cards, Badges)

### Arquivos Modificados

- `src/App.tsx` - Nova rota /whatsapp
- `src/components/AppSidebar.tsx` - Item WhatsApp no menu

### Arquivos Novos

- `src/pages/WhatsApp.tsx` - Pagina principal com as 3 colunas
- `src/components/whatsapp/WhatsAppSessionList.tsx` - Lista de sessoes
- `src/components/whatsapp/WhatsAppContactList.tsx` - Lista de contatos
- `src/components/whatsapp/WhatsAppChat.tsx` - Area de chat
- `src/components/whatsapp/WhatsAppQRDialog.tsx` - Dialog do QR Code
- `src/components/whatsapp/WhatsAppSettingsDialog.tsx` - Configuracoes Evolution
- `supabase/functions/create-whatsapp-session/index.ts`
- `supabase/functions/get-whatsapp-qr/index.ts`
- `supabase/functions/send-whatsapp-message/index.ts`
- `supabase/functions/whatsapp-evolution-webhook/index.ts`

## Ordem de Execucao

Devido ao tamanho, a implementacao sera feita em etapas:
1. Migration do banco (4 tabelas + RLS + realtime)
2. Solicitar secrets da Evolution API
3. Edge functions (4 funcoes)
4. Frontend (pagina + componentes)
5. Integracao no App.tsx e Sidebar

