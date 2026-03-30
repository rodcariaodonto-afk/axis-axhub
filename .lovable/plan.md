

## Botão "Excluir Duplicados" na página de Contatos

### O que será feito

Adicionar um botão "Excluir Duplicados" na barra de ações da página de Contatos que:

1. **Detecta duplicados** — Agrupa contatos por `first_name + last_name + email` (case-insensitive). Contatos com todos esses campos iguais são considerados duplicados.
2. **Mostra dialog de confirmação** — Lista os grupos de duplicados encontrados, mostrando quantos serão removidos.
3. **Remove duplicados** — Mantém o registro mais antigo (`created_at ASC`) de cada grupo e deleta os demais.
4. **Feedback** — Toast informando quantos contatos duplicados foram removidos (ou que nenhum foi encontrado).

### Implementação

**Arquivo:** `src/pages/Contacts.tsx`

- Adicionar estado `dedupDialogOpen` e `duplicateGroups`
- Função `findDuplicates()`: agrupa `contacts` em memória por chave normalizada, identifica grupos com 2+ registros
- Função `removeDuplicates()`: para cada grupo, mantém o mais antigo e deleta os outros via `supabase.from("contacts").delete().in("id", idsToRemove)`
- Botão com ícone `Copy` ao lado de "Novo Contato"
- Dialog mostrando lista de duplicados antes de confirmar exclusão

### Arquivos modificados
- `src/pages/Contacts.tsx` — botão + lógica de deduplicação + dialog de confirmação

