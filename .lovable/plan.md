

## Expandir Cadastro de Fornecedores

### 1. Migração SQL — Novos campos na tabela `suppliers`
```sql
ALTER TABLE public.suppliers
  ADD COLUMN phone2 text,
  ADD COLUMN contact_name text,
  ADD COLUMN state_registration text,    -- inscrição estadual
  ADD COLUMN city_registration text,     -- inscrição municipal
  ADD COLUMN postal_code text,
  ADD COLUMN street text,
  ADD COLUMN city text,
  ADD COLUMN state text,
  ADD COLUMN country text DEFAULT 'Brasil';
```

### 2. Atualizar formulário e tabela (`src/pages/Suppliers.tsx`)

**Formulário de criação** (dialog com scroll):
- Nome (existente)
- CNPJ (existente)
- Inscrição Estadual / Inscrição Municipal (grid 2 cols)
- Nome do Contato
- E-mail / Telefone 1 (grid 2 cols)
- Telefone 2
- Campos de endereço usando o componente `AddressFields` existente (CEP com auto-preenchimento, Estado com dropdown, Cidade dinâmica via IBGE)

**Tabela de listagem** — adicionar colunas: Contato, Telefone 2

**Estado do form** — expandir para incluir todos os novos campos; salvar na criação passando os campos individuais.

### Arquivos modificados
- Migração SQL (novos campos)
- `src/pages/Suppliers.tsx` — formulário expandido + `AddressFields` + novos campos na tabela

