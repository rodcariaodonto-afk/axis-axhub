

# Sistema de Categorias em Massa - Importacao, Templates e Packs

## Resumo

Implementar um sistema completo de gestao de categorias em massa na pagina de Configuracoes > Categorias de Produtos. O sistema permitira criar categorias via templates pre-definidos, importar CSV em massa, clonar categorias e importar packs por nicho.

## O que sera construido

### 1. Novas tabelas no banco de dados

- **category_templates**: Tabela com 200+ templates pre-definidos organizados por nicho (varejo, servicos, saude, manufatura, b2b, imobiliario, educacao). Campos incluem nome, icone, nicho, product_type, configuracoes (sku_required, track_inventory), variacoes permitidas, campos customizados e contagem de uso.

- **category_import_logs**: Tabela para rastrear importacoes CSV com status (pending, processing, completed, failed), contagem de linhas, sucessos, falhas e detalhes de erros.

- **Atualizacao de product_categories**: Adicionar colunas template_id, cloned_from_id, icon, niche, product_type, is_active, description, sku_required, track_inventory, allowed_variations e custom_fields.

### 2. Interface reformulada (ProductCategories.tsx)

A tela de categorias tera 3 abas:

- **Minhas Categorias**: Lista atual com busca, filtro por nicho, botao de clonar e editar
- **Templates**: Grade de templates pre-definidos filtrados por nicho, com botao "Usar Template" que cria a categoria automaticamente
- **Packs por Nicho**: Packs agrupados (Varejo 50+, Servicos 30+, Saude 40+, etc.) com botao para importar todas as categorias de um pack de uma vez

Botao de importar CSV no topo que aceita arquivo .csv com colunas: nome, icone, nicho, product_type.

### 3. Funcionalidades

- **Criar a partir de template**: Seleciona template, digita nome personalizado, categoria herda todas as configuracoes
- **Clonar categoria**: Duplica categoria existente com novo nome
- **Importar CSV**: Upload de arquivo CSV, parsing client-side, insercao em lote com log de erros
- **Importar Pack**: Um clique para importar dezenas de categorias de um nicho especifico
- **Busca e filtro**: Filtrar categorias por nome e por nicho

## Detalhes Tecnicos

### Migracao SQL

```sql
-- Tabela category_templates (templates pre-definidos, sem tenant_id pois sao globais)
CREATE TABLE category_templates (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  icon text,
  product_type text NOT NULL DEFAULT 'produto',
  sku_required boolean DEFAULT false,
  track_inventory boolean DEFAULT true,
  allowed_variations text[] DEFAULT ARRAY[]::text[],
  custom_fields jsonb DEFAULT '{}'::jsonb,
  niche text,
  is_popular boolean DEFAULT false,
  usage_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_category_templates_niche ON category_templates(niche);

-- Atualizar product_categories com novas colunas
ALTER TABLE product_categories
  ADD COLUMN IF NOT EXISTS icon text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS product_type text DEFAULT 'produto',
  ADD COLUMN IF NOT EXISTS niche text,
  ADD COLUMN IF NOT EXISTS sku_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS track_inventory boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS allowed_variations text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS custom_fields jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS template_id text,
  ADD COLUMN IF NOT EXISTS cloned_from_id uuid,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Tabela category_import_logs
CREATE TABLE category_import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  file_name text,
  total_rows int DEFAULT 0,
  successful_imports int DEFAULT 0,
  failed_imports int DEFAULT 0,
  errors jsonb,
  status text DEFAULT 'completed',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE category_import_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON category_import_logs FOR ALL
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- RLS para templates (leitura publica para todos autenticados)
ALTER TABLE category_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read templates" ON category_templates FOR SELECT
  TO authenticated USING (true);
```

Uma segunda migracao inserira os 200+ templates pre-definidos (varejo, servicos, saude, manufatura, b2b, imobiliario, educacao).

### Arquivo: src/pages/settings/ProductCategories.tsx (reescrita completa)

- 3 abas: "Minhas Categorias", "Templates", "Packs por Nicho"
- Estado para view, busca, filtro de nicho
- Funcoes: fetchCategories, fetchTemplates, handleUseTemplate, handleClone, handleImportCSV, handleImportPack
- CSV parsing feito client-side (split por linhas/virgulas)
- Insercao em lote com Promise.allSettled para capturar erros individuais
- Log de importacao salvo em category_import_logs

### Arquivo: src/integrations/supabase/types.ts

Sera atualizado automaticamente apos as migracoes para incluir os novos tipos.

## Sequencia de implementacao

1. Criar migracao com tabelas e colunas novas
2. Criar migracao com dados dos templates pre-definidos (200+ registros)
3. Reescrever ProductCategories.tsx com a nova interface completa

