
# Plano: Integrar Categorias Financeiras nas Contas a Pagar e a Receber

## Objetivo
As categorias financeiras (tags de receita/despesa) criadas no gerenciador de categorias precisam aparecer como campo selecionavel nos formularios de criacao e edicao de Contas a Pagar e Contas a Receber.

## 1. Migracao de Banco de Dados
Adicionar coluna `category_id` (UUID, nullable, com FK para `finance_categories`) em ambas as tabelas:

```text
payables    -> ADD COLUMN category_id UUID REFERENCES finance_categories(id)
receivables -> ADD COLUMN category_id UUID REFERENCES finance_categories(id)
```

## 2. Contas a Pagar (`src/pages/Payables.tsx`)

- Adicionar estado `categories` para armazenar categorias do tipo "despesa"
- Carregar categorias filtradas por `type = 'despesa'` ao abrir formulario
- Adicionar campo `category_id` ao estado do formulario
- Adicionar um `Select` com as categorias disponiveis no formulario (com bolinha colorida ao lado do nome)
- Incluir `category_id` no payload de insert/update
- Exibir a categoria na tabela de listagem com badge colorido
- Ao editar, preencher o campo com a categoria existente

## 3. Contas a Receber (`src/pages/Receivables.tsx`)

- Mesma logica, porem filtrando categorias do tipo "receita" (`type = 'receita'`)
- Adicionar campo `category_id` ao formulario e ao payload
- Exibir na tabela com badge colorido
- Ao criar parcelas, propagar a mesma categoria para todas

## 4. Exibicao na Tabela

Nova coluna "Categoria" nas duas tabelas, exibindo o nome da categoria com um indicador de cor (bolinha) ao lado. Query de listagem atualizada para incluir `finance_categories(name, color)` no select.

## Resumo dos Arquivos

| Arquivo | Acao |
|---------|------|
| Migracao SQL | Criar — adicionar `category_id` em `payables` e `receivables` |
| `src/pages/Payables.tsx` | Editar — campo de categoria (despesa) no form + coluna na tabela |
| `src/pages/Receivables.tsx` | Editar — campo de categoria (receita) no form + coluna na tabela |

## Detalhes Tecnicos

### Select de categoria no formulario:
```text
[Categoria (opcional)  v]
  - [cor] Alimentacao
  - [cor] Salario
  - [cor] Marketing
```

### Query atualizada:
```text
payables:    select("*, suppliers(name), finance_categories(name, color)")
receivables: select("*, customers(name), deals(name), orders(number), finance_categories(name, color)")
```

### Carga de categorias:
- Payables: `supabase.from("finance_categories").select("id, name, color").eq("type", "despesa")`
- Receivables: `supabase.from("finance_categories").select("id, name, color").eq("type", "receita")`
