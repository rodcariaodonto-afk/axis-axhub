## Aplicar migration `20260429170927_fiscal_integration.sql`

A migration já está sincronizada via GitHub (commit `ca1ac03`) e o arquivo está presente em `supabase/migrations/`. Não vou gerar SQL novo nem alterar outros arquivos — apenas executar o conteúdo existente contra o banco da Lovable Cloud.

### O que será aplicado (conteúdo do arquivo, sem modificações)

1. **Extensão**: `CREATE EXTENSION IF NOT EXISTS btree_gist` (necessária para a constraint `EXCLUDE` em `fiscal_invoices`).
2. **Tabela `public.fiscal_settings`** (1 por tenant, UNIQUE em `tenant_id`) com:
   - Dados da empresa: `company_name`, `cnpj`, `ie`, `im`, `regime_tributario` (1/2/3).
   - Endereço completo + `codigo_municipio_ibge`.
   - Tokens Focus NFe (homologação/produção), `focus_environment`, IDs de empresa Focus.
   - Metadados do certificado (`certificate_path`, `certificate_uploaded_at`, `certificate_registered_on_focus`) — sem armazenar senha.
   - Flags `habilita_nfe/nfse/nfce`.
   - Índice `idx_fiscal_settings_tenant`.
3. **Tabela `public.fiscal_invoices`** com:
   - FK opcional para `orders` (`ON DELETE SET NULL`).
   - `type` (`nfe|nfse|nfce`), `status` (`pendente|processando|autorizada|cancelada|erro|rejeitada`).
   - `focus_ref UNIQUE`, `focus_environment`, chave/numero/serie/protocolo, caminhos XML/DANFE.
   - `payload_enviado` e `resposta_focus` em JSONB.
   - Constraint `EXCLUDE USING gist` impedindo duas NFs ativas (pendente/processando/autorizada) para o mesmo `order_id` + `type`.
   - 4 índices: tenant, order, status, focus_ref.
4. **Campos fiscais em `public.products`**: `ncm`, `cfop`, `cst`, `unidade_fiscal` (default `'UN'`), `origem_icms` (default `0`).
5. **RLS**:
   - Habilitado em ambas as tabelas.
   - 4 policies em `fiscal_settings` (SELECT/INSERT/UPDATE/DELETE) isolando por `get_user_tenant_id()`.
   - 3 policies em `fiscal_invoices` (SELECT/INSERT/UPDATE) isolando por tenant.
6. **Triggers `updated_at`**: função `public.update_fiscal_updated_at()` + 2 triggers `BEFORE UPDATE`.
7. **Storage bucket `fiscal-certificates`**:
   - Privado, limite 5 MB, MIME `application/x-pkcs12` e `application/octet-stream`.
   - 4 policies em `storage.objects` isolando por pasta (`tenant_id` no primeiro nível do path).

### Verificação pós-aplicação

Após o `apply`, vou confirmar via `supabase--read_query`:
- Contagem das tabelas criadas (`fiscal_settings`, `fiscal_invoices`) em `information_schema.tables`.
- Presença do bucket em `storage.buckets`.
- RLS ativa (`pg_class.relrowsecurity`) e listagem das 7 policies em `pg_policies` para as duas tabelas + 4 policies de storage.
- Colunas novas em `products` via `information_schema.columns`.

### O que NÃO será feito

- Nenhuma edição em código TypeScript/React.
- Nenhuma nova migration ou ajuste de SQL.
- Nenhum seed de dados nem deploy de edge function.
