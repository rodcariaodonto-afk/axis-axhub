

# Correcoes WhatsApp: Imagens, Grupos, Emojis e Abas

## Problemas identificados e solucoes

### 1. Aba "Grupos" vazia (BUG CRITICO - RLS)

**Causa raiz**: As tabelas `whatsapp_contact_status` e `whatsapp_contact_tags` tem politicas RLS do tipo `RESTRICTIVE` sem nenhuma politica `PERMISSIVE`. No PostgreSQL, politicas RESTRICTIVE so restringem acesso -- elas exigem que pelo menos uma politica PERMISSIVE exista para conceder acesso. Resultado: o frontend nao consegue ler NENHUM registro dessas tabelas, entao `contact_status` e sempre `null` e a aba Grupos aparece vazia.

**Solucao**: Migracao SQL para trocar as politicas de RESTRICTIVE para PERMISSIVE em ambas as tabelas.

### 2. Nomes dos grupos mostrando IDs

**Causa raiz**: A Evolution API raramente envia `groupMetadata.subject` no payload de mensagens. O webhook tenta ler esse campo, mas ele vem null, entao o nome fica como "Grupo {ID}".

**Solucao**: Quando o webhook detecta uma mensagem de grupo e o display_name ainda e generico (comeca com "Grupo 1"), chamar a Evolution API `/group/findGroupInfos/{instance}` para buscar o nome real do grupo e atualizar no banco.

### 3. Imagens indisponiveis

**Causa raiz**: As mensagens RECENTES ja estao sendo salvas corretamente no storage permanente (os logs confirmam upload bem-sucedido). Porem, mensagens ANTIGAS ainda tem URLs temporarias do WhatsApp (`mmg.whatsapp.net`) que ja expiraram. Essas URLs nao podem ser recuperadas.

**Solucao**: 
- Melhorar o componente `ImageWithFallback` para tentar usar a URL do storage quando disponivel
- Para mensagens antigas com URL expirada, exibir uma mensagem mais amigavel
- Nao ha como recuperar imagens antigas com URLs expiradas

### 4. Emoji picker e reacoes

**Solucao**: 
- Adicionar um seletor de emojis no campo de input do chat (popup com emojis organizados por categoria)
- Nao vamos implementar reacoes em mensagens neste momento pois a Evolution API tem suporte limitado para isso e exigiria mudancas significativas no schema

### 5. Abas interligadas (logica de status automatico)

**Logica solicitada**:
- Mensagem recebida sem resposta = "Aguardando" (waiting)
- Conversa aberta/respondida = "Aberto" (open)
- Grupos = "Grupos" (group)

**Solucao**: No webhook, quando uma mensagem inbound chega de um contato individual:
- Se o status atual e "open" ou nao existe, mudar para "waiting" (aguardando resposta)
- Quando o usuario ENVIA uma mensagem (outbound), mudar o status para "attending" (atendendo)
- Manter "group" para grupos

## Arquivos a modificar

| Arquivo | Acao |
|---------|------|
| Migracao SQL | Corrigir RLS de `whatsapp_contact_status` e `whatsapp_contact_tags` |
| `supabase/functions/whatsapp-evolution-webhook/index.ts` | Buscar nome do grupo via API + auto-status "waiting" para inbound |
| `src/pages/WhatsApp.tsx` | Atualizar status para "attending" ao enviar mensagem |
| `src/components/whatsapp/WhatsAppChat.tsx` | Adicionar emoji picker no input |
| `src/components/whatsapp/WhatsAppContactList.tsx` | Ajustar filtro de grupos para usar `is_group` como fallback |

## Detalhes tecnicos

### Migracao SQL
```text
- DROP POLICY "Tenant isolation" ON whatsapp_contact_status
- CREATE POLICY "Tenant isolation" ON whatsapp_contact_status FOR ALL USING (tenant_id = get_user_tenant_id()) -- PERMISSIVE (default)
- Mesmo para whatsapp_contact_tags
```

### Webhook - busca de nome do grupo
Ao processar mensagem de grupo, se display_name comeca com "Grupo 1":
1. Buscar settings do tenant (evolution_api_url, evolution_api_key)
2. Chamar `GET {evolutionUrl}/group/findGroupInfos/{instanceName}?groupJid={phone}@g.us`
3. Atualizar display_name com o `subject` retornado

### Webhook - auto-status
Ao receber mensagem inbound de contato individual (nao grupo):
- Se status atual e "open" ou "closed", atualizar para "waiting"
- Isso faz a conversa aparecer na aba "Aguard."

### WhatsApp.tsx - status ao enviar
Na funcao `handleSend`, apos enviar com sucesso:
- Se o contato atual tem status "waiting", atualizar para "attending"
- Isso move a conversa para a aba "Atend."

### Emoji picker
Implementar um popup simples com emojis organizados (sem dependencia externa):
- Botao de emoji ao lado do campo de texto
- Popover com grid de emojis comuns
- Ao clicar, insere o emoji no campo de texto

### Filtro de grupos (fallback)
Na `WhatsAppContactList`, o filtro da aba Grupos vai usar:
```text
c.contact_status?.status === "group" || c.is_group === true
```
Isso garante que grupos aparecem mesmo se o status nao for carregado corretamente.

## Ordem de implementacao

1. Migracao SQL (corrigir RLS) -- resolve aba Grupos e tags
2. Webhook (nome do grupo + auto-status waiting)
3. WhatsApp.tsx (status attending ao enviar)
4. WhatsAppChat.tsx (emoji picker)
5. WhatsAppContactList.tsx (filtro fallback)
6. Deploy edge functions

