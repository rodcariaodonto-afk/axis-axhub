

# Correcao de Imagens e Layout Redimensionavel no WhatsApp

## Problemas

1. **Imagens "indisponivel"**: As URLs de midia do WhatsApp (mmg.whatsapp.net) sao temporarias e expiram em poucos minutos. O webhook salva essas URLs, mas quando o usuario abre o chat, elas ja expiraram.

2. **Lista de contatos cortada**: O layout usa larguras fixas (w-56 para sessoes, w-72 para contatos) que nao permitem ajuste. O texto dos contatos e abas fica cortado.

## Solucao

### 1. Download de midia no webhook e armazenamento permanente

Atualizar o `whatsapp-evolution-webhook` para:
- Quando receber uma mensagem com midia (imagem, audio, video, documento), fazer download da URL temporaria do WhatsApp
- Salvar o arquivo no Supabase Storage (bucket `whatsapp-media`)
- Armazenar a URL publica permanente do Storage no campo `content`
- Isso garante que as imagens nunca expirem

Criar o bucket `whatsapp-media` via migracao SQL com politica publica de leitura.

### 2. Melhorar fallback de imagem no chat

Atualizar `WhatsAppChat.tsx`:
- Usar estado React para controlar fallback de imagem (em vez de manipulacao DOM direta)
- Mostrar icone e texto "Imagem indisponivel" de forma limpa quando a imagem falha

### 3. Layout redimensionavel com react-resizable-panels

O projeto ja tem `react-resizable-panels` instalado. Atualizar `WhatsApp.tsx`:
- Substituir o layout de 3 colunas com largura fixa por `ResizablePanelGroup` com `ResizablePanel` e `ResizableHandle`
- Sessoes: painel com tamanho padrao ~15%, minimo 10%
- Contatos: painel com tamanho padrao ~25%, minimo 15%
- Chat: painel flexivel com o resto do espaco
- O usuario podera arrastar as bordas para redimensionar cada coluna

## Detalhes Tecnicos

### Arquivos modificados
- **Migracao SQL**: Criar bucket `whatsapp-media` no Supabase Storage
- **`supabase/functions/whatsapp-evolution-webhook/index.ts`**: Download de midia e upload para Storage
- **`src/components/whatsapp/WhatsAppChat.tsx`**: Fallback de imagem via estado React
- **`src/pages/WhatsApp.tsx`**: Layout com ResizablePanelGroup

### Fluxo de midia no webhook
1. Recebe mensagem com `mediaUrl` da Evolution API
2. Faz `fetch(mediaUrl)` para baixar o conteudo
3. Faz upload para `whatsapp-media/{tenant_id}/{message_id}.{ext}` no Storage
4. Obtem URL publica permanente
5. Salva JSON `{url: publicUrl, caption}` no campo `content`

### Layout redimensionavel
```text
+------------------+------------------------+---------------------------+
|   Sessoes (15%)  |  Contatos (25%)        |     Chat (60%)            |
|   min: 10%       |  min: 15%              |     min: 30%              |
|                  |                        |                           |
|  [drag handle]   [drag handle]            |                           |
+------------------+------------------------+---------------------------+
```

### Ordem de execucao
1. Criar migracao para bucket de storage
2. Atualizar webhook para download + upload de midia
3. Corrigir fallback de imagem no chat
4. Implementar layout redimensionavel

