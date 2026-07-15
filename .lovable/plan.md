# Documentação Portável do Módulo Gestão de PJ

Vou gerar um único arquivo Markdown auto-contido em `/mnt/documents/gestao-pj-portable.md` (com `<presentation-artifact>` para download) descrevendo tudo que existe hoje neste projeto sobre Gestão de PJ, de forma que você consiga reconstruir/portar em outra conta/projeto (inclusive fora do Lovable).

## Escopo do documento

O .md cobrirá os seguintes blocos, extraídos diretamente do código atual:

### 1. Visão geral e arquitetura
- Objetivo do módulo (portal PJ, repasses, documentos, avaliações, impostos, NF, ranking, dados bancários, contratos PJ).
- Diagrama textual (ASCII) do fluxo: Tenant → PJ → Portal PJ → Repasses/NF/Documentos/Impostos.
- Modelo multi-tenant (`tenant_id`, `get_user_tenant_id()`, RLS PERMISSIVE) e como o acesso PJ se sobrepõe via `pj_portal_access`.

### 2. Modelo de dados (SQL completo)
Para cada tabela do módulo, incluirei: `CREATE TABLE`, GRANTS, RLS, políticas, índices, triggers e funções relacionadas. Tabelas a documentar:
- `pj_portal_access`
- `pj_bank_data`
- `pj_documents`, `pj_document_types`, `pj_document_versions`
- `pj_evaluations`, `pj_evaluation_criteria`
- `pj_repasses`, `pj_repasse_schedules`
- `nf_approvals`, `nf_workflow_config`, `nf_workflow_steps`
- `pj_tax_settings`, `pj_tax_dashboard` (views/RPC)
- `pj_notifications`
- Tabelas de contratos PJ relevantes
- Funções: `get_user_tenant_id()`, `has_role()`, RPCs de dashboard/ranking, triggers de expiração.

Fonte: schema atual no Supabase + migrations relevantes.

### 3. Edge Functions
Listagem + código-fonte (ou resumo + endpoints + payloads) das functions:
- `approve-nf-step`
- `process-scheduled-repasses`
- `check-document-expiry`
- `check-contract-expiry`
- `dispatch-webhook` e `api-gateway` (na parte que afeta PJ)
- Cron schedules recomendados.

### 4. Frontend (React + TS)
Mapeamento de componentes/páginas/hooks a portar:
- Páginas: `PJDocuments`, `PJRanking`, `Repasses`, `NFApprovals`, `NFApprovalDetail`, `TaxManagement`, `BankManagement`, `pj-portal/*`.
- Componentes: `src/components/pj-portal/*`, `pj-documents/*`, `pj-evaluation/*`, `repasses/*`, `nf-approval/*`, `tax-management/*`, `bank-management/*`, `crm/InvitePJPortalDialog`, `ManagePJPortalAccessDialog`.
- Hooks: `usePJPortalAccess`, `usePJBankData`, `usePJContracts`, `usePJDocuments`, `usePJDocumentTypes`, `usePJEvaluations`, `usePJEvaluationCriteria`, `usePJNotifications`, `usePJRepasses`, `useRepasseAdmin`, `useRepasseSchedule`, `useNFApprovals`, `useNFWorkflowConfig`, `useTaxDashboard`, `useTaxSettings`, `useConciliation`, `useDocumentCompliance`, `useContractVigency`, `useInvitePJPortal`.
- Para cada arquivo: caminho, responsabilidade, dependências (shadcn/ui, react-query, supabase-js) e o conteúdo completo do arquivo em bloco de código.

### 5. Convenções e regras de negócio
Do memory do projeto: RBAC, terminologia PT-BR, tenant scoping, impostos (RPA), split de repasses, versionamento de documentos, assinatura eletrônica LGPD, alertas de expiração.

### 6. Guia de portabilidade passo a passo
1. Criar tabelas + RLS + GRANTS (SQL do bloco 2).
2. Criar buckets de storage (`pj-documents`, `signed-contracts`) com políticas tenant-scoped.
3. Deploy das edge functions + cron.
4. Copiar hooks/componentes/páginas.
5. Rotas a registrar no `App.tsx` e itens de sidebar.
6. Variáveis de ambiente / secrets necessárias.
7. Checklist de smoke test.

### 7. Dependências npm
Lista mínima: `@supabase/supabase-js`, `@tanstack/react-query`, `react-router-dom`, `lucide-react`, `date-fns`, `recharts`, `zod`, componentes shadcn/ui utilizados.

## Detalhes técnicos

- Executarei em modo build: consultas ao Supabase (`supabase--read_query` no `information_schema`, `pg_policies`, `pg_proc`) para extrair schema, políticas e funções exatas; leituras em massa dos arquivos listados; concatenação em um único `.md`.
- Saída: `/mnt/documents/gestao-pj-portable.md` (auto-contido, ~algumas centenas de KB dependendo do volume de código incluído). Se ficar muito grande, divido em `gestao-pj-portable.md` + anexos `gestao-pj-portable-frontend.md` / `-backend.md`, sempre em `/mnt/documents/`.
- Nenhum arquivo do projeto será modificado.
