

## Plano: Filtrar sessões WhatsApp por dono (admin)

### Problema
Todos os admins veem todas as sessões WhatsApp do tenant. Cada admin deveria ver apenas suas próprias sessões e sessões de usuários não-admins.

### Mudanças

**1. Migração SQL** — Adicionar `owner_user_id` à tabela `whatsapp_sessions`
```sql
ALTER TABLE whatsapp_sessions ADD COLUMN owner_user_id uuid REFERENCES auth.users(id);
```

**2. Edge Function `create-whatsapp-session`** — Gravar `owner_user_id: userId` ao inserir a sessão.

**3. Frontend `src/pages/WhatsApp.tsx`** — Filtrar sessões no `loadSessions`:
- Se o usuário é admin: mostrar apenas sessões onde `owner_user_id` é o próprio ou é de um não-admin (ou NULL).
- Se não é admin: mostrar apenas suas próprias sessões ou sem dono.

```typescript
const visible = data.filter(s => {
  const owner = s.owner_user_id;
  if (!owner || owner === user.id) return true;
  if (isAdmin && adminUserIds.includes(owner)) return false; // outro admin
  return true;
});
```

**4. Atribuir sessões existentes** — As sessões atuais ("Rico 2", "RICO") ficarão sem `owner_user_id` (NULL) e serão visíveis para todos até que alguém as "adote" ao interagir. Alternativamente, posso atribuí-las ao primeiro admin encontrado.

### Arquivos modificados
- Migração SQL (nova coluna)
- `supabase/functions/create-whatsapp-session/index.ts`
- `src/pages/WhatsApp.tsx`

