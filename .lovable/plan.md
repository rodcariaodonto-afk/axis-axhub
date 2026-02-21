

# Correcao do Erro de Importacao CSV de Leads

## Problema Identificado

O Radix UI `<SelectItem>` nao aceita `value=""` (string vazia). Isso causa o erro:

```
A <Select.Item /> must have a value prop that is not an empty string.
```

Quando o dialog de mapeamento CSV abre, ele renderiza `<SelectItem value="">— Ignorar —</SelectItem>` na linha 372, o que causa o crash imediato da pagina.

O mesmo bug existe em `Contacts.tsx` com `<SelectItem value="">Nenhuma</SelectItem>`.

## Solucao

### Arquivo 1: `src/pages/Leads.tsx`

- Linha 372: Trocar `value=""` por `value="__ignore__"` no SelectItem "Ignorar"
- Linha 369: Ajustar o `onValueChange` para converter `"__ignore__"` de volta para string vazia no estado `csvMapping`

### Arquivo 2: `src/pages/Contacts.tsx`

- Trocar `<SelectItem value="">Nenhuma</SelectItem>` por `<SelectItem value="__none__">Nenhuma</SelectItem>`
- Ajustar o `onValueChange` do Select de Empresa para converter `"__none__"` de volta para string vazia no form

## Detalhes Tecnicos

No `Leads.tsx`, a mudanca principal:

```tsx
// Antes (causa crash):
<SelectItem value="">— Ignorar —</SelectItem>

// Depois:
<SelectItem value="__ignore__">— Ignorar —</SelectItem>
```

E no handler de mudanca:

```tsx
onValueChange={(v) => setCsvMapping({ ...csvMapping, [field]: v === "__ignore__" ? "" : v })}
```

No `Contacts.tsx`, mesma logica:

```tsx
// Antes:
<SelectItem value="">Nenhuma</SelectItem>

// Depois:
<SelectItem value="__none__">Nenhuma</SelectItem>
```

E no handler:

```tsx
onValueChange={(v) => setForm({ ...form, account_id: v === "__none__" ? "" : v })}
```

Sao apenas 4 linhas alteradas no total, corrigindo os dois crashes.

