

## Módulo de Assinatura Eletrônica com Validade Legal (OTP + Trilha de Auditoria)

### Contexto atual
O sistema já possui tabelas `contracts`, `contract_signatures` e `contract_versions`, além de assinatura via Canvas. A proposta é adicionar um fluxo de assinatura eletrônica avançada com OTP por e-mail, trilha de auditoria completa e conformidade com a Lei 14.063/2020.

---

### 1. Banco de Dados — Nova tabela + alterações

**Nova tabela `signature_audit_logs`** (trilha de auditoria legal):
- `id` UUID PK
- `tenant_id` UUID (FK tenants, RLS)
- `contract_id` UUID (FK contracts)
- `signer_email` TEXT NOT NULL
- `signer_name` TEXT
- `otp_hash` TEXT (hash SHA-256 do OTP)
- `otp_expires_at` TIMESTAMPTZ
- `otp_verified` BOOLEAN DEFAULT false
- `ip_address` TEXT
- `user_agent` TEXT
- `status` TEXT (pending, verified, expired, failed)
- `signed_at` TIMESTAMPTZ
- `created_at` TIMESTAMPTZ DEFAULT now()

**RLS em `signature_audit_logs`:**
- SELECT: somente tenant do usuário autenticado (`get_user_tenant_id()`)
- INSERT: bloqueado via RLS (apenas Edge Functions com service role)
- UPDATE/DELETE: bloqueado

**Alterações na tabela `contracts`:**
- Adicionar coluna `signer_email` TEXT (e-mail do signatário externo)
- Adicionar coluna `signer_name` TEXT

**Novo storage bucket `axis-contracts`** (privado, para PDFs gerados)

---

### 2. Edge Functions (3 funções)

**`generate-contract`**
- Valida JWT do usuário autenticado via `getClaims()`
- Recebe `contract_id`, busca dados do contrato
- Gera PDF simples com os dados do contrato (usando texto formatado, não biblioteca pesada)
- Salva no bucket `axis-contracts` (privado)
- Atualiza `contracts.document_url` com o path do storage
- Retorna URL assinada temporária (60min)

**`request-otp`**
- Valida JWT do usuário autenticado
- Recebe `contract_id` e `signer_email`
- Gera OTP de 6 dígitos, salva hash SHA-256 em `signature_audit_logs` com expiração de 15min
- Envia OTP via Resend (API key já configurada nos secrets)
- Atualiza `contracts.signature_status` para "Pending"
- Retorna confirmação

**`verify-and-sign`**
- Valida JWT do usuário autenticado
- Recebe `contract_id`, `otp_code`, captura IP e User-Agent do request
- Valida OTP contra hash no banco (verifica expiração)
- Se válido: marca `otp_verified = true`, registra IP/User-Agent/signed_at
- Atualiza `contracts.signature_status` para "Signed" e `signed_at`
- Retorna sucesso com dados da trilha de auditoria

---

### 3. Frontend — Componentes React

**Atualização do `ContractDetail.tsx` — tab Assinatura:**
- Seção "Solicitar Assinatura": campos para e-mail e nome do signatário + botão "Enviar OTP"
- Seção "Verificar OTP": input de 6 dígitos (usando `InputOTP` já existente) + botão "Verificar e Assinar"
- Tabela de trilha de auditoria mostrando logs de assinatura do contrato
- Botão "Gerar PDF" que invoca `generate-contract` e mostra link para download
- Botão "Exportar Auditoria (JSON)" para conformidade LGPD

**Fluxo visual:**
1. Criador clica "Gerar PDF" → documento é gerado e salvo
2. Criador preenche e-mail do signatário → clica "Enviar Código OTP"
3. Signatário recebe OTP por e-mail
4. Criador (ou signatário com acesso) insere o OTP → clica "Verificar e Assinar"
5. Status muda para "Assinado" com trilha de auditoria completa

---

### 4. Segurança e Conformidade

- Toda validação de OTP ocorre exclusivamente no backend (Edge Functions)
- OTP armazenado como hash SHA-256 (nunca em texto plano)
- Trilha de auditoria imutável (sem UPDATE/DELETE via RLS)
- IP e User-Agent capturados no servidor
- Exportação JSON da trilha para atendimento a requisições LGPD
- Frontend usa apenas `supabase.functions.invoke()`, sem chaves de API expostas
- Mensagens de erro genéricas no frontend

### Arquivos criados/modificados
- Migration SQL (nova tabela, bucket, RLS)
- `supabase/functions/generate-contract/index.ts` (novo)
- `supabase/functions/request-otp/index.ts` (novo)
- `supabase/functions/verify-and-sign/index.ts` (novo)
- `src/pages/ContractDetail.tsx` (atualização da tab Assinatura)
- `supabase/config.toml` (config das novas funções)

