

# Segmentacao de Conexoes WhatsApp

## Objetivo

Adicionar sistema de segmentacao ao modulo WhatsApp existente, incluindo abas de status (Abertos, Atendendo, Aguardando, Grupos), tags/rotulos coloridos para contatos, filtros avancados e contadores dinamicos.

## Alteracoes no Banco de Dados

### Nova tabela: `whatsapp_contact_tags`
- Armazena tags/rotulos por contato (ex: COMERCIAL, VIP, CLIENTE)
- Colunas: id, tenant_id, contact_id, tag_name, tag_color
- Constraint UNIQUE(contact_id, tag_name)
- RLS com tenant isolation

### Nova tabela: `whatsapp_contact_status`
- Armazena status de atendimento por contato
- Colunas: id, tenant_id, contact_id, status (open/attending/waiting/group/closed), assigned_to, last_status_change
- Constraint UNIQUE(contact_id)
- RLS com tenant isolation

### Alteracoes em `whatsapp_contacts`
- Adicionar coluna `color_code` (VARCHAR para cor visual)
- Adicionar coluna `priority` (inteiro: -1 baixa, 0 normal, 1 alta)

## Frontend - Componentes

### 1. `WhatsAppContactList.tsx` - Refatorar
- Adicionar abas de segmentacao acima da lista: Todas, Abertos, Atendendo, Aguardando, Grupos
- Cada aba mostra contador dinamico
- Exibir tags coloridas em cada contato
- Exibir icone de status ao lado do contato

### 2. Novo componente: `WhatsAppTagManager.tsx`
- Dialog para adicionar/remover tags de um contato
- Seletor de cor para a tag
- Tags pre-definidas sugeridas (COMERCIAL, AFILIADO, CLIENTE, VIP, BLOQUEADO)

### 3. `WhatsApp.tsx` - Atualizar
- Carregar contatos com joins para tags e status
- Adicionar estado para filtro de segmento ativo
- Adicionar logica de mudanca de status via dropdown no chat header
- Filtrar contatos localmente por segmento e busca

### 4. `WhatsAppChat.tsx` - Atualizar header
- Mostrar status atual do contato
- Dropdown para mudar status (Aberto, Atendendo, Aguardando, Fechado)
- Botao para adicionar tag ao contato

## Detalhes Tecnicos

- As queries de contatos usarao joins com `whatsapp_contact_status` e `whatsapp_contact_tags` diretamente pelo Supabase client (sem necessidade de edge functions extras)
- Contadores serao calculados no frontend a partir dos dados carregados
- Mudancas de status e tags serao feitas diretamente via Supabase client (insert/update/delete)
- O webhook `whatsapp-evolution-webhook` sera atualizado para criar automaticamente um registro em `whatsapp_contact_status` com status "open" quando um novo contato chega
- Adaptar referencias de `workspace_id` do documento para `tenant_id` usado no projeto

## Arquivos Modificados/Criados

- Migracao SQL para criar tabelas e alterar `whatsapp_contacts`
- `src/components/whatsapp/WhatsAppContactList.tsx` - Adicionar abas, tags e status
- `src/components/whatsapp/WhatsAppTagManager.tsx` - Novo componente
- `src/components/whatsapp/WhatsAppChat.tsx` - Header com status e tags
- `src/pages/WhatsApp.tsx` - Logica de segmentacao e filtros
- `supabase/functions/whatsapp-evolution-webhook/index.ts` - Auto-criar status "open" para novos contatos

## Ordem de Execucao

1. Criar tabelas no banco (migracao)
2. Atualizar webhook para criar status automaticamente
3. Refatorar WhatsAppContactList com abas e tags
4. Criar WhatsAppTagManager
5. Atualizar WhatsAppChat com controles de status
6. Integrar tudo no WhatsApp.tsx

