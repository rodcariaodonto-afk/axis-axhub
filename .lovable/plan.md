# Trocar a logo do AXIS

A logo é importada em 4 lugares (sidebar, auth, reset password, landing header) sempre a partir do mesmo arquivo:

```
src/assets/axis-logo.png
```

## Ação

1. Copiar `user-uploads://Logo_AXIS.png` por cima de `src/assets/axis-logo.png` (mesmo nome, mesmo caminho).
2. Nenhuma alteração de código necessária — todos os imports continuam válidos automaticamente.

## Onde a nova logo aparecerá

- Sidebar do app (`AppSidebar.tsx`)
- Tela de login (`Auth.tsx`)
- Tela de reset de senha (`ResetPassword.tsx`)
- Header da landing page (`LandingHeader.tsx`)

## Observação

O footer da landing usa o texto "AXIS" como wordmark (não imagem) e não será alterado. Se quiser trocar esse texto ou substituir também por imagem, me avise.
