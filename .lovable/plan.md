

# Modulo de Configuracoes Completo — AXHUB

## Resumo

Transformar a pagina `/settings` em um modulo completo com layout de duas colunas (menu lateral esquerdo + area de conteudo a direita), contendo 8 secoes funcionais que aproveitam tabelas existentes e criam as faltantes.

---

## Tabelas Existentes (reutilizar)

| Tabela | Uso |
|--------|-----|
| `tenants` | Dados da empresa (name, cnpj, segment) |
| `profiles` | Usuarios do tenant |
| `user_roles` | Perfis de acesso |
| `warehouses` | Depositos de estoque |
| `audit_logs` | Logs de auditoria |
| `product_custom_fields` | Campos customizados de produtos |

## Novas Tabelas (criar via migracao)

| Tabela | Campos |
|--------|--------|
| `company_settings` | id, tenant_id, company_name, cnpj, address, logo_url, primary_color, secondary_color, created_at, updated_at |
| `api_keys` | id, tenant_id, user_id, name, api_key, created_at |
| `product_categories` | id, tenant_id, name, created_at |
| `integrations` | id, tenant_id, platform, api_key, api_secret, webhook_url, is_active, created_at, updated_at |

Todas com RLS por `tenant_id = get_user_tenant_id()`.

---

## Estrutura de Arquivos

```text
src/pages/settings/
  SettingsLayout.tsx       -- Layout duas colunas com menu lateral
  CompanyGeneral.tsx       -- Dados da empresa (company_settings + tenants)
  UsersManagement.tsx      -- Lista de usuarios, convite, edicao de perfil
  ApiKeysManagement.tsx    -- CRUD de chaves de API
  CustomFieldsSettings.tsx -- Campos customizados (product_custom_fields)
  AuditLogsView.tsx        -- Visualizacao de audit_logs com filtros
  ProductCategories.tsx    -- CRUD de categorias de produtos
  WarehousesSettings.tsx   -- CRUD de depositos (warehouses existente)
  IntegrationsSettings.tsx -- CRUD de integracoes externas
```

A pagina `src/pages/Settings.tsx` sera reescrita para importar `SettingsLayout` e renderizar as sub-paginas via tabs ou state interno (sem sub-rotas, tudo em uma unica rota `/settings`).

---

## Detalhamento das Secoes

### 1. Empresa > Geral (`CompanyGeneral.tsx`)
- Formulario com react-hook-form: nome, CNPJ, endereco
- Upsert em `company_settings` (cria se nao existe, atualiza se existe)
- Registra em `audit_logs` ao salvar

### 2. Sistema > Usuarios (`UsersManagement.tsx`)
- Tabela listando `profiles` do tenant com coluna de role (join com `user_roles`)
- Botao "Convidar Usuario" — modal com email + selecao de perfil (admin, vendas, financeiro, operacao, contabilidade, leitura)
- Convite via `supabase.auth.admin.createUser` nao e possivel no frontend; alternativa: gerar link de convite ou simplesmente registrar o email e role para quando o usuario se cadastrar
- Edicao de role inline ou via modal
- Apenas admins podem acessar

### 3. Sistema > Chaves de API (`ApiKeysManagement.tsx`)
- Tabela listando `api_keys` do tenant
- Botao "Gerar Nova Chave" — gera UUID como chave, mostra uma unica vez
- Botao excluir chave
- Registra em `audit_logs`

### 4. Sistema > Campos Customizados (`CustomFieldsSettings.tsx`)
- Reutiliza `product_custom_fields` existente
- Tabela com field_name, field_type, is_required, options
- Modal para criar/editar campo
- Registra em `audit_logs`

### 5. Sistema > Logs de Auditoria (`AuditLogsView.tsx`)
- Tabela readonly listando `audit_logs` do tenant
- Filtros: por entidade, por acao, por periodo
- Paginacao (50 por pagina)
- Sem edicao/exclusao

### 6. Cadastros > Categorias de Produtos (`ProductCategories.tsx`)
- CRUD simples na tabela `product_categories`
- Lista + botao "Nova Categoria" (modal)
- Edicao inline ou modal
- Exclusao com confirmacao
- Registra em `audit_logs`

### 7. Suprimentos > Depositos (`WarehousesSettings.tsx`)
- CRUD usando tabela `warehouses` existente
- Lista com nome, endereco, is_default
- Modal para criar/editar
- Nao permitir excluir deposito padrao
- Registra em `audit_logs`

### 8. Integracoes (`IntegrationsSettings.tsx`)
- CRUD na tabela `integrations`
- Lista de integracoes com plataforma, status (ativo/inativo)
- Modal para adicionar: selecionar plataforma (Shopify, MercadoLivre, N8N, WhatsApp API, Gmail API), inserir credenciais
- Toggle ativo/inativo
- Registra em `audit_logs`

---

## Menu Lateral do Settings (SettingsLayout.tsx)

O menu tera as seguintes secoes:

```text
EMPRESA
  - Geral

SISTEMA
  - Usuarios
  - Chaves de API
  - Campos Customizados
  - Logs de Auditoria

CADASTROS
  - Categorias de Produtos

SUPRIMENTOS
  - Depositos

INTEGRACOES
  - Integracoes
```

Cada item do menu muda o conteudo a direita via estado interno (useState). O item ativo fica destacado.

---

## Controle de Acesso

- Verificacao no componente `Settings.tsx`: se o usuario nao tem role `admin`, exibir mensagem "Acesso restrito a administradores" e nao renderizar o modulo
- Usar `has_role` function existente via query em `user_roles`

---

## Migracao SQL

Uma unica migracao criando:
1. `company_settings` com RLS
2. `api_keys` com RLS
3. `product_categories` com RLS
4. `integrations` com RLS

---

## Ordem de Implementacao

1. Migracao SQL (4 novas tabelas)
2. `SettingsLayout.tsx` (layout duas colunas + menu)
3. `Settings.tsx` (reescrever para usar SettingsLayout)
4. `CompanyGeneral.tsx`
5. `UsersManagement.tsx`
6. `ApiKeysManagement.tsx`
7. `CustomFieldsSettings.tsx`
8. `AuditLogsView.tsx`
9. `ProductCategories.tsx`
10. `WarehousesSettings.tsx`
11. `IntegrationsSettings.tsx`

