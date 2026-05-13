# Auditoria — Governança de Dados (AXHUB)

## ✅ O que está correto

| Item | Status |
|---|---|
| Página `/settings/governance` com 8 abas | ✅ Visão geral, Exportações, Auditoria, Retenção & Exclusão, Conformidade, Pedidos dos titulares, Consentimentos, Políticas |
| RLS ativa em todas as 5 novas tabelas | ✅ `data_exports`, `data_deletion_requests`, `data_subject_requests`, `data_governance_policies`, `data_consents` |
| Isolamento por `tenant_id = get_user_tenant_id()` | ✅ Em todas as policies |
| Restrição de gravação a `admin` via `has_role(auth.uid(),'admin')` | ✅ Em todas as policies sensíveis |
| Bucket privado `data-exports` com isolamento por path `{tenant_id}/...` | ✅ |
| Edge Functions `governance-export` e `governance-cancel-account` validam JWT, tenant e role admin | ✅ Usam `getClaims` + checagem em `user_roles` |
| Exportação JSON exclui anexos/mídias, mantém metadados/URLs | ✅ Comentado no `_meta.note` e tabelas de mídia binária ficam fora do scope |
| Cancelamento define `cancelled_at`, `retention_until = +30 dias`, `deletion_status='pending_retention'` e gera audit `severity=critical` | ✅ |
| Cards/Overview consomem dados reais (sem dados fictícios) | ✅ Todas as queries vão ao banco |
| Compliance report calculado em runtime sobre tabelas reais | ✅ |
| pg_cron diário 03:00 UTC para `governance-execute-deletion` | ✅ Agendado |

## 🔴 Falhas críticas encontradas

### 1. `governance-deletion-request` quebra ao gravar auditoria
Usa colunas que **não existem** em `audit_logs`:
- envia `user_id` → correto é `actor_user_id`
- envia `entity_type` → correto é `entity`

Resultado: a inserção falha e o request é retornado mesmo sem trilha auditável.

### 2. `governance-execute-deletion` quebra em 2 pontos
- Mesmos campos errados em `audit_logs` (`entity_type` em vez de `entity`).
- Atualiza `data_deletion_requests` com `completed_at` e `error_message` — **essas colunas não existem na tabela**. As corretas são `executed_at` e `audit_snapshot.error`.

Resultado: o cron diário falhará silenciosamente em todas as execuções.

### 3. `governance-execute-deletion` é publicamente invocável
Não valida JWT nem segredo compartilhado do cron. Qualquer pessoa com a URL pode disparar processamento de exclusões.

Correção: exigir header `x-cron-secret` comparado com secret `GOVERNANCE_CRON_SECRET` (a ser adicionado) e atualizar o pg_cron para enviar esse header.

### 4. Coluna ausente para rastrear erro de exclusão
`data_deletion_requests` precisa de `executed_at` (já existe) e um campo de erro. Adicionar `error_message text` para rastreabilidade.

## 🟡 Riscos remanescentes (documentar, não bloqueante)

- **Super-admin AXHolding ainda não está separado do admin do cliente.** Hoje qualquer `role='admin'` da própria conta tem acesso a Governança. Não existe role `super_admin` global. Recomendação para próxima iteração: criar role `super_admin` em `user_roles` (sem `tenant_id` exigido) e gating extra para ações cross-tenant. **Esta auditoria não cobre essa entrega — apenas confirma que admin de tenant A nunca vê dados do tenant B (RLS garante isolamento).**
- **Policies de `data_consents` permitem SELECT a qualquer usuário autenticado do tenant** (não só admin). Intencional para que vendedores vejam opt-ins, mas vale registrar.
- **42 warnings pré-existentes do linter Supabase** (search_path mutável, extensão em public, etc.) não foram introduzidos pela governança e ficam fora do escopo.

## 🛠 Correções a aplicar nesta iteração

### Migration (adicionar coluna)
```sql
ALTER TABLE public.data_deletion_requests
  ADD COLUMN IF NOT EXISTS error_message text;
```

### Edge `governance-deletion-request/index.ts`
Substituir o INSERT em `audit_logs` para usar `actor_user_id` e `entity`. Adicionar validação Zod já está ok.

### Edge `governance-execute-deletion/index.ts`
- Trocar `entity_type` → `entity`, remover `user_id`.
- Trocar `completed_at` → `executed_at` no UPDATE.
- Gravar erro em `error_message` e em `audit_snapshot.error`.
- Adicionar autenticação por header `x-cron-secret`:
  ```ts
  if (req.headers.get("x-cron-secret") !== Deno.env.get("GOVERNANCE_CRON_SECRET")) {
    return new Response("forbidden", { status: 403 });
  }
  ```
- Pedir ao usuário para criar a secret `GOVERNANCE_CRON_SECRET` (via `add_secret`).
- Reagendar o pg_cron incluindo o header no `net.http_post`.

### Compliance Report
Adicionar verificação automática "super_admin separado de admin" como item informativo (passa enquanto não houver role super_admin, marcado como "pendente roadmap").

## 📋 Entregáveis ao final

Relatório técnico final com:
- Tabelas criadas/alteradas (já listadas acima)
- Políticas RLS aplicadas (todas com `tenant_id` + `has_role`)
- Edge Functions: 5 (governance-export, governance-compliance-report, governance-cancel-account, governance-deletion-request, governance-execute-deletion)
- Página: `/settings/governance` com 8 abas + integração no `SettingsLayout`
- Permissão: módulo `governanca` (admin only)
- Riscos corrigidos: 4 falhas críticas acima
- Riscos remanescentes: super_admin global, search_path warnings, SELECT amplo em consents

Aprove para eu aplicar as 4 correções (migration + 2 edges + secret + reagendamento do cron).
