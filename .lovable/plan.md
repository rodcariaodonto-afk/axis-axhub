
# Correcao de Mensagens de Grupo no WhatsApp

## Problema

O webhook trata mensagens de grupo como se fossem mensagens individuais. Isso acontece porque:

1. O `remoteJid` para grupos termina com `@g.us` (ex: `120363041880062148@g.us`), mas o codigo trata como se fosse um numero de telefone individual
2. O `display_name` do contato e definido com o `pushName` do remetente (nome da pessoa), nao o nome do grupo
3. O status nao e definido como "group", entao nao aparece na aba Grupos
4. Cada mensagem de grupo de uma pessoa diferente cria um "contato" separado com o ID do grupo, sobrescrevendo o nome com o pushName de quem mandou por ultimo

## Solucao

### 1. Webhook: Detectar e tratar grupos (`whatsapp-evolution-webhook`)

Modificar o processamento de mensagens para:
- Verificar se `remoteJid` termina com `@g.us` - se sim, e um grupo
- Para grupos, usar o JID do grupo como `phone_number` do contato (ja acontece)
- Extrair o nome do grupo do payload da Evolution API (`msg.messageStubParameters`, `data.groupMetadata?.subject`, ou manter o JID se nao disponivel)
- **NAO sobrescrever** o `display_name` com `pushName` para grupos - pushName e o nome do remetente individual
- Armazenar o `sender_name` (pushName) e `sender_phone` (participant) na mensagem para exibir quem mandou no grupo
- Auto-criar status "group" para contatos de grupo (em vez de "open")

Deteccao de grupo:
```
const isGroup = key.remoteJid?.endsWith("@g.us");
const phone = key.remoteJid?.split("@")[0];
const participant = isGroup ? (key.participant?.split("@")[0] || null) : null;
```

Para o nome do grupo, a Evolution API pode enviar em:
- `data.groupMetadata?.subject`
- `msg.groupMetadata?.subject` 
- Se nao disponivel, usar o JID do grupo como fallback

Na criacao do contato de grupo:
- `display_name` = nome do grupo (nao pushName)
- Status automatico = "group" (nao "open")
- Nao atualizar `display_name` com `pushName` em updates subsequentes

Na mensagem:
- `sender_name` = pushName (nome de quem enviou)
- `sender_phone` = participant (telefone de quem enviou)

### 2. Chat: Mostrar nome do remetente em grupos (`WhatsAppChat.tsx`)

Para mensagens inbound em grupos (quando o contato e um grupo):
- Exibir o `sender_name` acima do conteudo da mensagem
- Usar cor diferenciada para o nome do remetente
- Detectar que e grupo verificando se `contactPhone` tem formato de grupo (numero grande sem formato de telefone)

### 3. ContactList: Icone de grupo (`WhatsAppContactList.tsx`)

Para contatos com status "group":
- Mostrar icone de grupo (Users) no avatar
- Ja funciona pela logica existente de filtragem por status

### 4. Migracao: Adicionar coluna `is_group` na tabela contacts

Adicionar coluna booleana `is_group` na tabela `whatsapp_contacts` para facilitar a identificacao de grupos vs contatos individuais. Isso evita depender apenas do status para saber se e grupo.

## Arquivos modificados

- **Migracao SQL**: Adicionar coluna `is_group` boolean default false na tabela `whatsapp_contacts`
- **`supabase/functions/whatsapp-evolution-webhook/index.ts`**: Detectar grupos, extrair nome do grupo, definir status "group", armazenar sender info corretamente
- **`src/components/whatsapp/WhatsAppChat.tsx`**: Exibir nome do remetente em mensagens de grupo
- **`src/pages/WhatsApp.tsx`**: Nenhuma alteracao necessaria (ja suporta status "group")

## Fluxo corrigido para mensagens de grupo

```text
Mensagem recebida no grupo "Familia"
  remoteJid: 120363041880062148@g.us
  participant: 5511999998888@s.whatsapp.net
  pushName: "Joao"
  
  -> Detecta @g.us -> isGroup = true
  -> phone = "120363041880062148" (ID do grupo)
  -> participant = "5511999998888"
  
  -> Contato: phone="120363041880062148", display_name="Familia" (ou JID), is_group=true
  -> Status: "group"
  -> Mensagem: sender_name="Joao", sender_phone="5511999998888"
  
  No chat: mostra "Joao" acima da mensagem
  Na lista: mostra na aba "Grupos" com icone de grupo
```
