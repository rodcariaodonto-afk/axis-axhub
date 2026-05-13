# Governança de Dados — AXIS

Implementação de uma camada completa de **Governança de Dados** dentro de Configurações da Conta, multi-tenant, auditável e pronta para venda B2B. Reutiliza `tenants` (= account), `audit_logs`, `get_user_tenant_id()`, `has_role()` e o sistema de permissões já existente.

## Escopo da nova área

Nova rota `/settings` → seção **Governança de Dados** (acesso: Admin do tenant + permissão nova `governanca`). Página com 8 abas seguindo o padrão visual do AXIS (cards de status, indicadores, tabelas, dialogs):

1. **Visão Geral** — KPIs: última exportação, pedidos de titulares abertos, exclusões pendentes, eventos críticos 30d, retenção configurada, status da conta, integrações ativas, usuários com permissões elevadas, riscos detectados. Estado vazio real quando não há dados.
2. **Exportações** — listar exportações, botão "Nova exportação" (escolhe escopo de módulos), download seguro com link expirável.
3. **Auditoria** — substitui/expande `AuditLogsView`. Filtros por entidade, severidade, usuário, período, IP. Export CSV/JSON.
4. **Retenção & Exclusão** — política de 30 dias pós-cancelamento. Mostra `cancelled_at`, `retention_until`, `deletion_scheduled_at`. Botão "Cancelar conta" e "Solicitar exclusão definitiva" com dupla confirmação.
5. **Conformidade** — relatório automático (RLS ativa, retenção configurada, pedidos vencidos, usuários inativos, permissões elevadas, integrações sensíveis, webhooks sem revisão). Export JSON.
6. **Pedidos dos Titulares** — CRUD de `data_subject_requests` (acesso, correção, portabilidade, anonimização, exclusão, oposição, revogação). SLA, atribuição, resolução.
7. **Consentimentos** — visão consolidada de consentimentos por contato/lead/cliente. Filtros por canal, base legal, opt-in/opt-out.
8. **Políticas** — formulário de configuração das políticas da conta (retenção, expiração de exportações, classificação, regras de comunicação, SLA).

## Banco de dados (migration única)

**Novas tabelas** (todas com `tenant_id`, RLS ativa, somente Admin do tenant lê/escreve via `has_role(auth.uid(),'admin') AND tenant_id = get_user_tenant_id()`):

- `data_exports` — `id, tenant_id, requested_by, status (pending|processing|completed|failed|expired), format, scope jsonb, file_url, file_size_bytes, expires_at, created_at, completed_at, error_message, metadata jsonb`.
- `data_deletion_requests` — `id, tenant_id, requested_by, approved_by, status (pending|approved|confirmed|executing|completed|cancelled), reason, scheduled_for, confirmation_token, confirmed_at, executed_at, audit_snapshot jsonb`.
- `data_subject_requests` — campos exatamente como no enunciado.
- `data_governance_policies` — `tenant_id (unique), retention_days (default 30), export_expiration_hours (default 72), allow_export_roles text[], allow_deletion_roles text[], data_classification jsonb, communication_rules jsonb, dsr_sla_days, anonymization_policy jsonb, updated_by, updated_at`.
- `data_consents` — `id, tenant_id, subject_type (contact|lead|customer|form_response), subject_id, channel (email|whatsapp|sms|phone), consent_status (granted|revoked|pending), consent_source, legal_basis, data_origin, given_at, revoked_at, privacy_notes, communication_opt_in, created_at`.

**Alterações em tabelas existentes:**
- `tenants` → adicionar `cancelled_at`, `retention_until`, `deletion_scheduled_at`, `deletion_status`, `deletion_reason`.
- `audit_logs` → adicionar colunas opcionais `event_type`, `severity (info|warning|critical)`, `metadata jsonb`. Manter compatibilidade com `entity/action/before_json/after_json` já existentes.

**Índices** em `(tenant_id, created_at desc)`, `(tenant_id, status)` para listagens.

**Permissão nova:** módulo `governanca` em `user_permissions` (view/manage). Apenas Admin do tenant por padrão.

## Edge Functions (verify_jwt validado em código + Zod)

- `governance-export` — POST `{ scope: string[] }`. Valida sessão, role admin, permissão `governanca.manage`, limite de 1 export ativo por hora. Cria registro `data_exports (status=processing)`, coleta dados de TODAS as tabelas do tenant em JSON (clientes, fornecedores, produtos, pedidos, estoque, financeiro, leads, contatos, oportunidades, deals, atividades, contratos, propostas, BI, campanhas, mensagens WhatsApp, cadências, workflows, execuções, formulários, respostas, chat interno, integrações, webhooks, logs, configurações). Anexos/binários: somente metadados + URL referenciada. Faz upload em bucket privado `data-exports/{tenant_id}/{export_id}.json`, gera signed URL com `expires_at`, marca `completed`. Loga em `audit_logs (severity=critical)`.
- `governance-deletion-request` — solicita exclusão; gera token; envia confirmação por e-mail (Resend); ao confirmar agenda execução para `now() + retention_days`.
- `governance-execute-deletion` — invocada manualmente ou por cron (pg_cron diário) quando `scheduled_for <= now()`. Anonimiza/exclui dados do tenant em ordem segura; loga snapshot.
- `governance-compliance-report` — calcula on-demand o relatório de conformidade da conta e retorna JSON.
- `governance-cancel-account` — Owner cancela conta → seta `cancelled_at`, `retention_until = now()+30d`. Durante janela, exportações continuam disponíveis.

**Storage:** novo bucket privado `data-exports` com policy "tenant isolation via path prefix".

**Cron (pg_cron):**
- diário 03:00 — expirar exports vencidos (`status=expired`, remove arquivo);
- diário 04:00 — invocar `governance-execute-deletion` para tenants com `retention_until < now()`.

## Frontend

Novos arquivos em `src/pages/settings/governance/`:
- `GovernanceHub.tsx` (container com `<Tabs>`)
- `OverviewTab.tsx`, `ExportsTab.tsx`, `AuditTab.tsx` (reaproveita AuditLogsView), `RetentionTab.tsx`, `ComplianceTab.tsx`, `SubjectRequestsTab.tsx`, `ConsentsTab.tsx`, `PoliciesTab.tsx`
- `NewExportDialog.tsx`, `NewSubjectRequestDialog.tsx`, `CancelAccountDialog.tsx`, `ConfirmDeletionDialog.tsx`

Hook `useGovernance.ts` com queries/mutations React Query.

Adicionar entrada em `SettingsLayout.tsx` (grupo novo "GOVERNANÇA" → item "Governança de Dados") e registrar no `Settings.tsx` `SECTION_MAP`.

Mensagens de áudito em PT-BR. Toda mutação crítica → `audit_logs` com severity adequada.

## Pontos técnicos

- Tudo usa `tenant_id = get_user_tenant_id()` em RLS — isolamento total por conta.
- Edge Functions usam `service_role` apenas após validar `getClaims()` + papel admin + `tenant_id` do solicitante.
- `data_exports.scope` permite escolha granular (todos os módulos por padrão).
- `data_consents` é alimentado por triggers nos pontos de captura (form_responses, leads novos, opt-in WhatsApp) — fora do escopo desta entrega entregar todos os triggers; entregamos schema + UI + ingest manual + helper para futuros pontos.
- Nenhuma permissão padrão concedida a não-admin; super-admin AXHolding fica para etapa posterior (não há tabela cross-tenant ainda).

## Entrega final

Relatório técnico em chat ao concluir: tabelas criadas/alteradas, RLS, Edge Functions, páginas, permissões, riscos corrigidos e remanescentes (ex.: triggers de consentimento automáticos por canal, painel super-admin AXHolding).
