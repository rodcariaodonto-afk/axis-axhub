

## Problema

O campo "Categoria" no formulario de novo produto e um campo de texto livre (`Input`). Ele deveria ser um dropdown (`Select`) que carrega as categorias cadastradas na tabela `product_categories` do banco de dados.

## Solucao

Alterar o arquivo `src/pages/Products.tsx` para:

1. **Buscar categorias do banco** - Adicionar uma funcao `fetchCategories` que consulta a tabela `product_categories` e armazena no estado.
2. **Trocar o Input por Select** - Substituir o campo de texto "Categoria" por um componente `Select` com as opcoes vindas do banco, incluindo uma opcao vazia "Nenhuma".
3. **Garantir scroll e visibilidade** - O `SelectContent` ja possui scroll nativo do Radix, mas sera adicionada a classe `max-h-60` para limitar a altura e garantir a barra de rolagem quando houver muitas categorias.

## Detalhes Tecnicos

### Arquivo: `src/pages/Products.tsx`

- Novo estado: `const [categories, setCategories] = useState<{id: string, name: string}[]>([]);`
- Nova funcao `fetchCategories` que faz `supabase.from("product_categories").select("id, name").order("name")`
- Chamada no `useEffect` junto com as outras buscas
- Substituicao do bloco de Categoria:

```tsx
// DE:
<Input value={form.category} onChange={...} />

// PARA:
<Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
  <SelectTrigger><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
  <SelectContent className="max-h-60 bg-popover">
    <SelectItem value="none">Nenhuma</SelectItem>
    {categories.map((cat) => (
      <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

Nenhuma alteracao no banco de dados e necessaria, pois a tabela `product_categories` ja existe.

