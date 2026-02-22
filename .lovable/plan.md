

# Templates de Mensagens (Aprimorado) + Chat Interno

## Visao Geral

Duas grandes funcionalidades para a plataforma AXIS:
1. **Templates de Mensagens aprimorados** com campo `type` (whatsapp/campanha/geral) e integracao direta no chat WhatsApp e nas Campanhas
2. **Chat Interno** entre funcionarios com conversas diretas e em grupo, em tempo real

---

## Parte 1: Templates de Mensagens Aprimorados

### O que ja existe
- Tabela `email_templates` com campos `name`, `subject`, `body`, `variables`
- Painel em Configuracoes > Templates (`MessageTemplatesSettings.tsx`)

### O que precisa mudar

**Banco de Dados:**
- Adicionar coluna `type TEXT DEFAULT 'geral'` na tabela `email_templates` (valores: whatsapp, campanha, geral)

**Frontend - MessageTemplatesSettings.tsx:**
- Adicionar campo `type` (select) no formulario de criacao/edicao
- Adicionar filtro por tipo na listagem
- Adicionar busca por nome

**Integracao WhatsApp - WhatsAppChat.tsx:**
- Adicionar botao "Inserir Template" ao lado do emoji picker na barra de input
- Ao clicar, abre modal listando templates (filtrados por type = 'whatsapp' ou 'geral')
- Ao selecionar, insere o conteudo na caixa de texto substituindo variaveis como `{{nome}}` pelo nome do contato

**Integracao Campanhas - Campanhas.tsx:**
- Adicionar dropdown "Selecionar Template" no formulario de criacao de campanha
- Ao selecionar, preenche o campo `mensagem_template` com o conteudo do template

---

## Parte 2: Chat Interno (Nova Funcionalidade)

### Banco de Dados - 3 novas tabelas

**Tabela `internal_conversations`:**
- id, tenant_id, type (direct/group), name (para grupos), created_at, updated_at
- RLS com tenant isolation
- Realtime habilitado

**Tabela `internal_conversation_participants`:**
- id, conversation_id (FK), user_id, joined_at
- RLS com tenant isolation (via join com conversations)

**Tabela `internal_messages`:**
- id, conversation_id (FK), sender_id, content, created_at, read_at
- RLS com tenant isolation (via join com conversations)
- Realtime habilitado

### Frontend - Novos Componentes

**Pagina `src/pages/InternalChat.tsx`:**
- Layout de 3 colunas similar ao WhatsApp usando `react-resizable-panels`
- Coluna esquerda: lista de conversas com busca, indicador de nao-lidas
- Coluna principal: area de chat com historico de mensagens, campo de input
- Botao "Nova Conversa" abrindo modal

**Componente `src/components/internal-chat/InternalChatSidebar.tsx`:**
- Lista de conversas do usuario logado
- Busca por nome
- Badge de mensagens nao lidas
- Separacao visual entre diretas e grupos

**Componente `src/components/internal-chat/InternalChatWindow.tsx`:**
- Historico de mensagens com avatar e nome do remetente
- Campo de input com envio por Enter
- Scroll automatico para mensagens novas
- Supabase Realtime para mensagens em tempo real

**Componente `src/components/internal-chat/NewConversationModal.tsx`:**
- Selecao de tipo (Direta ou Grupo)
- Busca de usuarios do mesmo tenant (tabela profiles)
- Para grupo: nome do grupo + selecao multipla de participantes

### Navegacao
- Adicionar item "Chat Interno" no sidebar (`AppSidebar.tsx`) no grupo "Comunicacao" com icone `MessageSquare`
- Adicionar rota `/internal-chat` no `App.tsx`

### Realtime
- Habilitar Realtime nas tabelas `internal_messages` e `internal_conversations`
- Subscription por conversation_id para receber mensagens em tempo real
- Contador de nao-lidas no sidebar (badge no icone)

---

## Detalhes Tecnicos

### Arquivos Novos
- `src/pages/InternalChat.tsx`
- `src/components/internal-chat/InternalChatSidebar.tsx`
- `src/components/internal-chat/InternalChatWindow.tsx`
- `src/components/internal-chat/NewConversationModal.tsx`

### Arquivos Modificados
- `src/pages/settings/MessageTemplatesSettings.tsx` - tipo + filtro + busca
- `src/components/whatsapp/WhatsAppChat.tsx` - botao inserir template
- `src/pages/Campanhas.tsx` - dropdown de template
- `src/components/AppSidebar.tsx` - item Chat Interno
- `src/App.tsx` - rota /internal-chat

### Migracao SQL
- ALTER TABLE email_templates ADD COLUMN type TEXT DEFAULT 'geral'
- CREATE TABLE internal_conversations (com RLS)
- CREATE TABLE internal_conversation_participants (com RLS)
- CREATE TABLE internal_messages (com RLS)
- ALTER PUBLICATION supabase_realtime ADD TABLE internal_messages, internal_conversations

### Seguranca (RLS)
- Todas as novas tabelas terao RLS com tenant isolation via `get_user_tenant_id()`
- Participantes so podem ver conversas das quais fazem parte
- Mensagens so visiveis para participantes da conversa
