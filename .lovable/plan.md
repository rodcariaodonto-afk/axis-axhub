

## Problema

Imagens e vídeos do WhatsApp não abrem dentro da plataforma por dois motivos:

1. **Imagens**: Clicam e abrem em nova aba (`window.open(url, "_blank")`) em vez de abrir num lightbox/modal dentro da plataforma.
2. **Vídeos**: São renderizados apenas como um link de texto ("Vídeo") — não há player de vídeo embutido, nem preview.
3. **Áudios**: Também são apenas links — sem player inline.

## Solução

Criar um componente **MediaLightbox** (modal fullscreen) e renderizar mídias inline no chat:

### 1. Imagens — Abrir em lightbox interno
- Ao clicar na imagem, abrir um `Dialog` fullscreen com a imagem em tamanho grande (em vez de `window.open`).
- Manter botão para abrir em nova aba como opção secundária.

### 2. Vídeos — Player inline + lightbox
- Renderizar um `<video>` com controles diretamente na bolha da mensagem (poster/thumbnail).
- Ao clicar, abrir no lightbox em tela cheia.

### 3. Áudios — Player inline
- Renderizar um `<audio controls>` na bolha da mensagem em vez de link.

### Arquivos modificados
- **`src/components/whatsapp/WhatsAppChat.tsx`** — Substituir `window.open` por lightbox, adicionar players de vídeo/áudio inline, adicionar estado do lightbox com `Dialog`.

Nenhuma tabela ou edge function precisa ser alterada — é uma mudança puramente de UI.

