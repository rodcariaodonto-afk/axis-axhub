

# Sistema de Documentacao Dinamica Multi-Nicho

## Status: Nao implementado

Nenhuma parte desta especificacao existe no projeto atual. Sera necessario criar tudo do zero: tabelas, politicas RLS, componentes React, rota e navegacao.

## O que sera construido

### 1. Tabelas no banco de dados

Quatro tabelas novas (adaptadas ao modelo multi-tenant existente que usa `tenant_id` em vez de `workspace_id`):

- **documentation**: Armazena artigos com Markdown, metadados (nicho, categoria, subcategoria), versionamento, SEO (meta_title, meta_description, keywords), busca full-text via `tsvector` gerado automaticamente, e controle de publicacao/destaque.

- **documentation_views**: Rastreia visualizacoes por usuario com contagem, tempo gasto e votos de utilidade (helpful_yes/no). Chave unica por (documentation_id, user_id).

- **documentation_feedback**: Armazena avaliacoes com rating (1-5), comentario e flag is_helpful. Chave unica por (documentation_id, user_id).

- **documentation_translations**: Suporte multi-idioma (pt-BR, en-US, es-ES) com conteudo traduzido. Chave unica por (documentation_id, language).

Nota: A spec referencia `auth.users(id)` em foreign keys, mas seguindo o padrao do projeto, usaremos campos `uuid` sem FK direta para `auth.users` (o mesmo padrao usado em `profiles`, `activities`, etc.).

### 2. Politicas RLS

- Documentacao publicada (`is_published = true`): leitura publica para usuarios autenticados
- Criacao/edicao: restrita a admins do tenant (usando `has_role`)
- Feedback e views: usuarios podem inserir/atualizar seus proprios registros
- Isolamento por tenant em todas as tabelas

### 3. Indices de performance

- GIN index no campo `search_vector` para busca full-text
- Indices compostos em `(tenant_id, niche)`, `(slug)`, `(category)`

### 4. Componentes React

Quatro componentes principais em `src/components/documentation/`:

- **DocumentationCard**: Card de preview com titulo, descricao, nicho, views e percentual de utilidade
- **DocumentationViewer**: Visualizador completo com table of contents gerado do HTML, tracking de tempo e documentos relacionados
- **DocumentationSearch**: Busca com filtros por nicho e categoria, usando full-text search do PostgreSQL
- **FeedbackSection**: Avaliacao com estrelas (1-5) e comentario

### 5. Pagina principal

- Nova pagina `src/pages/Documentation.tsx` com listagem, busca e filtros
- Nova pagina `src/pages/DocumentationArticle.tsx` para visualizacao individual por slug
- Rotas: `/documentation` e `/documentation/:slug`
- Link na sidebar de navegacao

### 6. Funcionalidades admin

- Criar/editar artigos com editor Markdown (dentro de Settings ou na propria pagina de documentacao)
- Publicar/despublicar artigos
- Visualizar metricas: documentos mais vistos, menor taxa de utilidade, termos buscados

## Detalhes Tecnicos

### Migracao SQL principal

```sql
CREATE TABLE public.documentation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  niche VARCHAR(50) NOT NULL,
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100),
  content TEXT NOT NULL,
  content_html TEXT,
  version INT DEFAULT 1,
  previous_version_id UUID REFERENCES documentation(id),
  meta_title VARCHAR(255),
  meta_description VARCHAR(255),
  keywords TEXT[] DEFAULT '{}',
  is_published BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  order_index INT DEFAULT 0,
  created_by UUID NOT NULL,
  updated_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('portuguese', coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(content,''))
  ) STORED,
  UNIQUE(tenant_id, slug)
);

-- + documentation_views, documentation_feedback, documentation_translations
-- + indices e RLS policies
```

### Conversao Markdown para HTML

Sera feita client-side usando uma biblioteca leve (o conteudo Markdown sera armazenado e o HTML gerado/cacheado no campo `content_html`). Sanitizacao do HTML antes de renderizar.

### Busca Full-Text

```typescript
const { data } = await supabase
  .from('documentation')
  .select('*')
  .eq('is_published', true)
  .textSearch('search_vector', query, { type: 'websearch', config: 'portuguese' });
```

### Tracking de tempo

Usar `useEffect` com timer que registra o tempo ao sair da pagina via `POST` na tabela `documentation_views`.

## Sequencia de implementacao

1. Criar migracao com as 4 tabelas, indices e RLS policies
2. Criar componentes de documentacao (Card, Viewer, Search, Feedback)
3. Criar paginas Documentation e DocumentationArticle
4. Adicionar rotas no App.tsx e link na sidebar
5. Criar interface admin para criar/editar artigos
6. (Opcional) Seeder com artigos iniciais por nicho

## Dependencias externas

Nenhuma dependencia nova obrigatoria. O Markdown pode ser renderizado com logica simples ou, se necessario, instalar `react-markdown` + `remark-gfm` para melhor suporte.

