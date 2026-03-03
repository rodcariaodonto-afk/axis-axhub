
# Adicionar "Funis de Venda" ao menu lateral

## Problema
A pagina `/funis` existe e esta funcional, mas nao ha link no menu lateral para acessa-la. O usuario nao consegue navegar ate os funis de venda.

## Correcao

| Arquivo | Descricao |
|---------|-----------|
| `src/components/AppSidebar.tsx` | Adicionar item "Funis de Venda" na secao "Automacao" |

### Detalhes tecnicos

No array `groups`, dentro do grupo "Automacao", adicionar um novo item entre "Workflows" e "Cadencias":

```typescript
{ title: "Funis de Venda", url: "/funis", icon: GitBranch, module: "automacao" },
```

O icone `GitBranch` ja esta importado no arquivo. O resultado sera:

- Automacao
  - Workflows
  - **Funis de Venda** (novo)
  - Cadencias
