

## Integração Google Calendar no AXIS — Agenda Bidirecional

### Visão Geral
Criar um painel de Agenda dentro da aba **Comunicação** que exibe os eventos do Google Calendar do usuário e permite criar/editar eventos diretamente, com sincronização bidirecional (AXIS ↔ Google Calendar).

### Pré-requisitos — Segredos OAuth2
Antes de implementar, precisarei que você forneça:
- **GOOGLE_CLIENT_ID** — Client ID do OAuth2
- **GOOGLE_CLIENT_SECRET** — Client Secret do OAuth2

Esses serão armazenados de forma segura como secrets do projeto.

### Arquitetura

```text
┌─────────────┐      ┌──────────────────┐      ┌──────────────────┐
│  Frontend   │─────▶│  Edge Functions   │─────▶│ Google Calendar  │
│  /agenda    │      │  (proxy OAuth2)   │      │      API v3      │
└─────────────┘      └──────────────────┘      └──────────────────┘
                            │
                     ┌──────┴──────┐
                     │  Supabase   │
                     │  DB tables  │
                     └─────────────┘
```

### 1. Migração SQL — Tabela de tokens OAuth do usuário
- `google_calendar_tokens` — armazena `access_token`, `refresh_token`, `expires_at` por `user_id` e `tenant_id`
- `calendar_events` (cache local) — `id`, `google_event_id`, `user_id`, `tenant_id`, `title`, `description`, `start_at`, `end_at`, `location`, `all_day`, `synced_at`
- RLS: cada usuário só vê seus próprios tokens e eventos

### 2. Edge Functions (3 funções)

**`google-calendar-auth`** — Fluxo OAuth2:
- `GET ?action=authorize` → retorna URL de autorização Google
- `POST ?action=callback` → troca code por tokens, salva na tabela `google_calendar_tokens`

**`google-calendar-sync`** — Proxy de leitura/escrita:
- `GET ?action=list&timeMin=...&timeMax=...` → lista eventos do Google Calendar
- `POST ?action=create` → cria evento no Google Calendar
- `PUT ?action=update&eventId=...` → atualiza evento
- `DELETE ?action=delete&eventId=...` → remove evento
- Auto-refresh do access_token usando refresh_token quando expirado

**`google-calendar-webhook`** — Recebe push notifications do Google (sync reversa):
- Quando algo muda no Google Calendar, o Google envia notificação aqui
- Atualiza cache local na tabela `calendar_events`

### 3. Frontend — Nova página `/agenda`

**`src/pages/Agenda.tsx`**:
- Visualização de calendário mensal/semanal/diária (usando componentes próprios com Tailwind)
- Lista de eventos do dia na lateral
- Botão "Conectar Google Calendar" → inicia fluxo OAuth2
- Modal para criar/editar evento (título, data/hora início/fim, descrição, localização)
- Ao criar/editar/deletar → chama edge function → Google API + cache local
- Indicador de status de conexão Google

### 4. Sidebar e Rota

**`src/components/AppSidebar.tsx`** — Adicionar "Agenda" no grupo Comunicação:
```
{ title: "Agenda", url: "/agenda", icon: CalendarDays, module: "whatsapp" }
```

**`src/App.tsx`** — Adicionar rota `/agenda` protegida

### 5. Sincronização bidirecional
- **AXIS → Google**: Ao criar/editar/deletar evento na UI, a edge function envia para Google API e salva cache local
- **Google → AXIS**: Ao abrir a agenda, faz fetch dos últimos eventos (pull). Opcionalmente, configura Google Push Notifications via webhook para sync em tempo real

### Arquivos criados/modificados
- **Secrets**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (via add_secret)
- **Migração SQL**: tabelas `google_calendar_tokens`, `calendar_events` + RLS
- **Edge Functions**: `google-calendar-auth/index.ts`, `google-calendar-sync/index.ts`, `google-calendar-webhook/index.ts`
- **Frontend**: `src/pages/Agenda.tsx` (página completa com calendário visual)
- **Routing**: `src/App.tsx`, `src/components/AppSidebar.tsx`

