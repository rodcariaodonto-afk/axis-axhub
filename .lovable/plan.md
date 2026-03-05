

## Plan: Filtrar conversas WhatsApp entre admins

### Problema
Atualmente, todos os admins do mesmo tenant veem todas as conversas WhatsApp. O requisito é que cada admin veja apenas:
- Suas próprias conversas (onde ele é o atendente)
- Conversas de funcionários não-admins
- Conversas ainda não atribuídas (sem atendente)

Um admin **não** pode ver conversas atribuídas a outro admin.

### Abordagem

Utilizar o campo existente `whatsapp_contact_status.assigned_to` para controlar a visibilidade. A filtragem será feita no frontend após carregar os contatos.

### Mudanças

**1. Auto-atribuição ao enviar mensagem** (`src/pages/WhatsApp.tsx`)
- Quando um usuário envia uma mensagem, além de mudar o status para "attending", gravar o `assigned_to` com o ID do usuário logado
- Isso já acontece parcialmente no código, mas o `assigned_to` não está sendo preenchido

**2. Filtragem de contatos por visibilidade** (`src/pages/WhatsApp.tsx`)
- Após carregar os contatos e enriquecer com status/tags, aplicar filtro de visibilidade:
  - Buscar a lista de user IDs que são admins no tenant (via query em `user_roles`)
  - Se o usuário logado for admin: remover contatos cujo `assigned_to` pertence a outro admin
  - Se não for admin: mostrar apenas contatos atribuídos ao próprio usuário ou sem atribuição

**3. Exibir atendente no contato** (`src/components/whatsapp/WhatsAppContactList.tsx`)
- Mostrar o nome do atendente atribuído em cada contato na lista, para facilitar a identificação

### Detalhes técnicos

- Query para obter admin IDs do tenant:
```sql
SELECT user_id FROM user_roles 
WHERE role = 'admin' 
AND user_id IN (SELECT id FROM profiles WHERE tenant_id = ?)
```
- Filtro no frontend (dentro de `loadContactsImmediate`):
```typescript
// Se eu sou admin, esconder contatos assigned_to de outros admins
const visible = enriched.filter(c => {
  const assignedTo = c.contact_status?.assigned_to;
  if (!assignedTo) return true; // sem atribuição = visível
  if (assignedTo === user.id) return true; // meu = visível
  if (adminIds.includes(assignedTo)) return false; // de outro admin = oculto
  return true; // de não-admin = visível
});
```

### Arquivos modificados
- `src/pages/WhatsApp.tsx` — auto-assign + filtro de visibilidade
- `src/components/whatsapp/WhatsAppContactList.tsx` — exibir nome do atendente

