

# Correcao de Bugs do WhatsApp

## Problemas Identificados

1. **Imagens nao carregam no chat** - Quando recebe imagens, o chat mostra apenas "[media]" em vez de renderizar a imagem. O webhook salva o tipo como "image" mas nao salva a URL da midia. Precisamos capturar a URL da imagem da Evolution API e renderizar no chat.

2. **Contador de nao lidas nao zera ao abrir chat** - Quando o usuario clica em um contato, o `unread_count` e zerado no banco mas a lista de contatos nao e atualizada visualmente.

3. **Falta opcao de apagar chat** - Nao existe botao para deletar conversa com um contato.

4. **Abas de segmentacao sobrepostas** - As abas "Todas", "Abertos", "Atendendo", "Aguardando", "Grupos" ficam cortadas/sobrepostas porque o container e muito estreito (w-72) e o texto das abas nao cabe.

## Alteracoes Planejadas

### 1. Webhook: Capturar URL de midia (`whatsapp-evolution-webhook`)
- Extrair `mediaUrl` ou URL da midia do payload da Evolution API para mensagens de imagem, audio, video e documento
- Salvar a URL no campo `content` quando a mensagem for de midia (ou criar logica para armazenar separadamente)
- Para imagens com caption, salvar ambos

### 2. Chat: Renderizar imagens (`WhatsAppChat.tsx`)
- Verificar `message_type` - se for "image", renderizar `<img>` com a URL
- Manter o texto/caption abaixo da imagem se houver
- Para audio/video/documento, mostrar icone apropriado em vez de "[media]"

### 3. Zerar contador ao ler (`WhatsApp.tsx`)
- Apos o `update({ unread_count: 0 })`, chamar `loadContacts()` para atualizar a lista
- Atualizar tambem o estado local do contato selecionado

### 4. Botao de apagar chat (`WhatsAppChat.tsx` e `WhatsApp.tsx`)
- Adicionar botao de lixeira no header do chat
- Ao clicar, mostrar confirmacao
- Deletar todas as mensagens do contato e o proprio contato (cascade deleta tags e status)
- Limpar selecao apos deletar

### 5. Corrigir abas sobrepostas (`WhatsAppContactList.tsx`)
- Reduzir texto das abas ou usar scroll horizontal funcional
- Usar tamanhos menores de fonte e padding mais compacto
- Garantir que as abas nao se sobreponham

### 6. Corrigir warning de ref no WhatsAppTagManager
- O console mostra "Function components cannot be given refs" - o Dialog tenta passar ref para WhatsAppTagManager. Nao afeta funcionalidade mas sera corrigido.

## Detalhes Tecnicos

### Webhook - Captura de midia
A Evolution API envia URLs de midia no payload. O campo `mediaUrl` ou `message.imageMessage.url` contem o link direto. Vamos extrair e salvar junto com o conteudo.

### Arquivos modificados
- `supabase/functions/whatsapp-evolution-webhook/index.ts` - Capturar URL de midia
- `src/components/whatsapp/WhatsAppChat.tsx` - Renderizar imagens, botao apagar, icones de midia
- `src/components/whatsapp/WhatsAppContactList.tsx` - Corrigir abas sobrepostas
- `src/pages/WhatsApp.tsx` - Zerar unread ao abrir chat, logica de apagar chat
- `src/components/whatsapp/WhatsAppTagManager.tsx` - Corrigir warning de ref

### Ordem de execucao
1. Corrigir abas sobrepostas no ContactList
2. Corrigir zeragem de unread no WhatsApp.tsx
3. Adicionar botao e logica de apagar chat
4. Atualizar webhook para capturar URL de midia
5. Atualizar chat para renderizar imagens e midia
6. Corrigir warning de ref no TagManager
7. Deploy do webhook

