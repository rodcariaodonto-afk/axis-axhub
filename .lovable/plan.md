
# Plano: Aba "Categorias" no Financeiro com Tags de Receita/Despesa

## Objetivo
Adicionar uma aba "Categorias" dentro da pagina Financeiro (`/finance`), onde o usuario pode criar categorias financeiras com:
- Nome da categoria
- Tipo: **Receita** ou **Despesa** (radio)
- Cor da categoria (color picker com hex input, como na imagem de referencia)
- Listagem, edicao e exclusao das categorias criadas

## Mudancas

### 1. Migracao de banco de dados
Criar tabela `finance_categories` com:
- `id` UUID (PK)
- `tenant_id` UUID (FK para tenants)
- `name` TEXT (nome da categoria)
- `type` TEXT ('receita' | 'despesa')
- `color` TEXT (hex color, ex: '#3B82F6')
- `created_at` TIMESTAMPTZ
- `updated_at` TIMESTAMPTZ

Politicas RLS:
- SELECT, INSERT, UPDATE, DELETE filtrados por `tenant_id = get_user_tenant_id()`

### 2. Reestruturar `Finance.tsx` com Tabs
Transformar a pagina Finance para usar o componente `Tabs` (ja existente em `src/components/ui/tabs.tsx`):
- **Aba "Visao Geral"** (default) -- conteudo atual do dashboard financeiro
- **Aba "Categorias"** -- novo conteudo com CRUD de categorias

### 3. Novo componente `src/components/finance/FinanceCategoryManager.tsx`
Conteudo da aba Categorias:
- Botao "Nova Categoria" que abre um Dialog
- Dialog com:
  - Input "Nome da Categoria" (placeholder: "Ex: Alimentacao, Salario...")
  - Radio group "Tipo": Receita / Despesa
  - "Cor da Categoria": input hex color + preview de cor (similar a imagem)
  - Botao "Criar"
- Tabela listando categorias existentes com badge colorido, nome, tipo e acoes (editar/excluir)

### 4. Atualizar types (automatico)
O arquivo `types.ts` sera atualizado automaticamente apos a migracao.

## Detalhes Tecnicos

```text
Finance.tsx
+-----------------------------------------+
|  [Visao Geral]  [Categorias]            |
+-----------------------------------------+
|                                         |
|  (conteudo da aba selecionada)          |
|                                         |
+-----------------------------------------+
```

- O color picker usara um input `type="color"` nativo do HTML + input text para digitar o hex manualmente, replicando a experiencia da imagem de referencia
- A tabela `finance_categories` fica isolada por tenant via RLS, disponivel para todos os usuarios da empresa
- Seguira o padrao `getUserTenantId()` para queries seguras

### Arquivos a criar/editar:
1. **Criar**: Migracao SQL para `finance_categories`
2. **Criar**: `src/components/finance/FinanceCategoryManager.tsx`
3. **Editar**: `src/pages/Finance.tsx` -- adicionar Tabs com aba Visao Geral + Categorias
