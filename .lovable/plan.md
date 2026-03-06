

## Problema

Quando uma sessão pertence a outro admin (ex: "RICO"), mas tem contatos transferidos para você, o sistema mostra **todos** os contatos dessa sessão — incluindo os que não foram atribuídos a você. Isso acontece porque o filtro de contatos (linha 141-147) permite contatos sem `assigned_to` (NULL = visível para todos), e a maioria dos contatos não tem atribuição.

## Solução

Adicionar ao filtro de contatos uma verificação do **dono da sessão**. Quando o admin está vendo uma sessão que pertence a **outro admin**, ele só deve ver contatos explicitamente atribuídos a ele — não os sem atribuição.

### Mudança no filtro de contatos (`loadContactsImmediate`)

Lógica atualizada:

```text
Para cada contato na sessão selecionada:
  1. Se assigned_to = meu ID → visível (transferido para mim)
  2. Se assigned_to = outro admin → oculto
  3. Se assigned_to = não-admin → visível
  4. Se assigned_to = NULL:
     a. Se a sessão pertence a OUTRO ADMIN → oculto (não é meu)
     b. Senão → visível (sessão minha ou sem dono)
```

### Arquivo modificado
- `src/pages/WhatsApp.tsx` — ajustar o filtro de visibilidade de contatos para considerar o `owner_user_id` da sessão selecionada.

A mudança é de ~5 linhas no filtro existente, sem impacto em outras funcionalidades.

