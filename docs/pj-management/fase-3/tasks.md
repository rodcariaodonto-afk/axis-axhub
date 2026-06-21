# Tarefas: Gestão de PJ — Fase 3 (Otimização)

## Slice 15 — Schema Fase 3

- [ ] 15.1 Criar branch `feature/pj-management-slice15-schema-f3`
- [ ] 15.2 Criar migration:
  - [ ] 15.2.1 ALTER api_keys: scopes, rate_limit, is_active, last_used_at, expires_at
  - [ ] 15.2.2 ALTER bank_accounts: agency, account_type, pix_key, pix_key_type, cnpj_titular, pj_id + index
  - [ ] 15.2.3 ALTER nf_approvals: chave_nfe, sefaz_validation, sefaz_status
  - [ ] 15.2.4 ALTER nf_workflow_config: sefaz_validation_enabled
  - [ ] 15.2.5 ALTER pj_repasse_history: pix_payload, pix_qrcode_url, transaction_id, paid_date, paid_amount, conciliation_status
  - [ ] 15.2.6 CREATE TABLE pj_evaluation_criteria
  - [ ] 15.2.7 CREATE TABLE pj_evaluations
  - [ ] 15.2.8 CREATE TABLE pj_evaluation_scores
  - [ ] 15.2.9 CREATE TABLE pj_composite_scores + UNIQUE
  - [ ] 15.2.10 CREATE TABLE api_request_logs
  - [ ] 15.2.11 CREATE TABLE webhook_delivery_logs
  - [ ] 15.2.12 CREATE indexes (6)
  - [ ] 15.2.13 ENABLE RLS + policies + triggers
- [ ] 15.3 Commit + push + PR → main
- [ ] 15.4 Merge + aplicar migration no SQL Editor
- [ ] 15.5 Validar tabelas

---

## Slice 16 — Validação SEFAZ

- [ ] 16.1 Criar branch `feature/pj-management-slice16-sefaz`
- [ ] 16.2 Criar edge function `validate-nf-sefaz`:
  - POST: recebe nf_approval_id
  - Busca nf_approvals para chave_nfe
  - Busca fiscal_settings do tenant para Focus NFe token
  - Se token não configurado: retorna { status: 'nao_configurado' }
  - Consulta Focus NFe API: GET /v2/nfe/{chave}/consulta
  - Salva resultado em nf_approvals.sefaz_validation + sefaz_status
  - Timeout 10s, fallback 'sefaz_indisponivel'
- [ ] 16.3 Criar src/components/sefaz-validation/SefazValidationBadge.tsx — badge colorido por status
- [ ] 16.4 Criar src/components/sefaz-validation/SefazRevalidateButton.tsx — revalidar NF individual
- [ ] 16.5 Criar src/components/sefaz-validation/SefazBatchRevalidate.tsx — revalidar múltiplas NFs
- [ ] 16.6 Adicionar toggle sefaz_validation_enabled no NFWorkflowConfig
- [ ] 16.7 Integrar: no upload de NF, se sefaz_validation_enabled, chamar validate-nf-sefaz após validate-nf-xml
- [ ] 16.8 Adicionar coluna/badge SEFAZ na NFApprovalList + filtro
- [ ] 16.9 npm run build
- [ ] 16.10 Commit + push + PR → main

---

## Slice 17 — Dados Bancários + PIX

- [ ] 17.1 Criar branch `feature/pj-management-slice17-bank-pix`
- [ ] 17.2 Criar src/hooks/usePJBankData.ts — CRUD bank_accounts com pj_id
- [ ] 17.3 Criar src/components/bank-management/PJBankDataForm.tsx — form: banco (select), agência, conta, tipo, PIX key, PIX type (cpf/cnpj/email/telefone/aleatoria), CNPJ titular
- [ ] 17.4 Criar edge function `generate-pix-payload`:
  - POST: recebe pj_repasse_history_id
  - Busca repasse + bank_accounts do PJ (pix_key)
  - Gera payload PIX EMV (padrão BACEN)
  - Gera QR Code (base64 PNG)
  - Salva payload + qrcode_url no pj_repasse_history
  - Retorna { payload, qrcode_base64 }
- [ ] 17.5 Criar src/components/bank-management/PixPayloadGenerator.tsx — exibe payload copia-e-cola + QR Code renderizado
- [ ] 17.6 Integrar: botão "Gerar PIX" no detalhe do repasse (se PJ tem pix_key)
- [ ] 17.7 Criar portal PJ src/components/pj-portal/PJBankData.tsx — visualização read-only dos dados bancários
- [ ] 17.8 Adicionar rota /portal/dados-bancarios
- [ ] 17.9 npm run build
- [ ] 17.10 Commit + push + PR → main

---

## Slice 18 — Conciliação Bancária

- [ ] 18.1 Criar branch `feature/pj-management-slice18-conciliation`
- [ ] 18.2 Criar src/hooks/useConciliation.ts — mutation marcar como pago (transaction_id, paid_date, paid_amount), lógica de comparação valor_pago vs valor_esperado
- [ ] 18.3 Criar src/components/bank-management/ConciliationForm.tsx — form: ID transação, data pagamento, valor pago. Auto-compara e define status (conciliado/divergente).
- [ ] 18.4 Criar src/components/bank-management/ConciliationDashboard.tsx — tabela repasses pendentes vs pagos vs conciliados vs divergentes. Filtros por PJ, período, status.
- [ ] 18.5 Criar src/components/bank-management/BankDashboard.tsx — 4 cards: total pendente, pago no mês, conciliado, divergências. Lista PJs com dados bancários incompletos. Extrato por conta.
- [ ] 18.6 Criar src/pages/BankManagement.tsx — rota /bank-management com tabs: Dados Bancários | Conciliação | Dashboard
- [ ] 18.7 Adicionar rota + sidebar
- [ ] 18.8 npm run build
- [ ] 18.9 Commit + push + PR → main

---

## Slice 19 — Avaliação: Config + Formulário

- [ ] 19.1 Criar branch `feature/pj-management-slice19-evaluation`
- [ ] 19.2 Criar src/hooks/usePJEvaluationCriteria.ts — CRUD pj_evaluation_criteria por tenant
- [ ] 19.3 Criar src/components/pj-evaluation/EvaluationCriteriaConfig.tsx — admin configura critérios: nome, descrição, peso (1-10), ativo/inativo. CRUD com dialog.
- [ ] 19.4 Criar src/hooks/usePJEvaluations.ts — CRUD pj_evaluations + pj_evaluation_scores. Cálculo: overall_score = soma(score * peso) / soma(pesos).
- [ ] 19.5 Criar src/components/pj-evaluation/EvaluationForm.tsx — select PJ, período, nota 1-5 por critério (estrelas), comentário. Calcular score na submission.
- [ ] 19.6 Criar src/components/pj-evaluation/EvaluationHistory.tsx — lista avaliações de um PJ com score, avaliador, período, detalhamento por critério.
- [ ] 19.7 npm run build
- [ ] 19.8 Commit + push + PR → main

---

## Slice 20 — Score Composto + Ranking

- [ ] 20.1 Criar branch `feature/pj-management-slice20-ranking`
- [ ] 20.2 Criar edge function `calculate-pj-score`:
  - POST: recebe pj_id, tenant_id
  - Calcula: evaluation_score (média avaliações), compliance_score (% docs válidos), punctuality_score (NFs entregues no prazo), rejection_penalty (% NFs rejeitadas)
  - Fórmula: final = (eval*0.4 + compliance*0.3 + punctuality*0.2) - (rejection*0.1)
  - Upsert em pj_composite_scores
- [ ] 20.3 Criar src/components/pj-evaluation/CompositeScoreCard.tsx — card com score final + breakdown visual (barras por componente)
- [ ] 20.4 Criar src/components/pj-evaluation/PJRankingDashboard.tsx — ranking decrescente, cards (melhor, pior, média, abaixo threshold), filtros
- [ ] 20.5 Criar src/components/pj-evaluation/ScoreEvolutionChart.tsx — gráfico de linha (recharts) com evolução do score ao longo do tempo
- [ ] 20.6 Criar src/pages/PJRanking.tsx — rota /pj-ranking com tabs: Ranking | Avaliar | Critérios
- [ ] 20.7 Criar portal PJ src/components/pj-portal/PJScoreView.tsx — PJ vê seu score + avaliações (sem ranking geral)
- [ ] 20.8 Adicionar rota /portal/avaliacao + /pj-ranking + sidebar
- [ ] 20.9 npm run build
- [ ] 20.10 Commit + push + PR → main

---

## Slice 21 — API: Gateway + Keys

- [ ] 21.1 Criar branch `feature/pj-management-slice21-api`
- [ ] 21.2 Criar src/hooks/useApiKeys.ts — CRUD api_keys expandido (scopes, rate_limit, is_active, expires_at). Gerar key segura (crypto.randomUUID + hash). Mascarar na listagem.
- [ ] 21.3 Criar src/components/api-management/ApiKeyManager.tsx — lista keys com nome, scopes (badges), rate limit, status, last_used, ações (revogar/editar)
- [ ] 21.4 Criar src/components/api-management/ApiKeyCreateDialog.tsx — form: nome, scopes (multi-select), rate limit, expiração. Key exibida APENAS na criação (copy button).
- [ ] 21.5 Criar edge function `api-gateway`:
  - Recebe qualquer método + path
  - Valida X-API-Key header → busca api_keys
  - Verifica: is_active, expires_at, scopes vs path
  - Rate limiting: count requests no último minuto via api_request_logs
  - Roteia para handler interno baseado no path
  - Endpoints: GET /api/v1/pj, GET /api/v1/pj/:id, GET /api/v1/pj/:id/contracts, GET /api/v1/pj/:id/repasses, GET /api/v1/nf, POST /api/v1/nf, GET /api/v1/nf/:id, GET /api/v1/documents/:pjId
  - Respostas JSON padronizadas: { data, meta: { total, page, per_page } }
  - Log em api_request_logs
- [ ] 21.6 Criar src/components/api-management/ApiRequestLogs.tsx — tabela de logs: method, path, status, response_time, IP, timestamp. Filtros.
- [ ] 21.7 Criar src/pages/ApiManagement.tsx — rota /api-management com tabs: Keys | Logs
- [ ] 21.8 npm run build
- [ ] 21.9 Commit + push + PR → main

---

## Slice 22 — Webhooks + Docs + Integração Final

- [ ] 22.1 Criar branch `feature/pj-management-slice22-webhooks`
- [ ] 22.2 Criar src/hooks/useWebhookConfig.ts — CRUD integration_webhooks com eventos PJ-específicos
- [ ] 22.3 Criar src/components/api-management/WebhookConfig.tsx — form: URL, secret (auto-gerado), eventos (multi-select checkboxes), ativo/inativo. Lista webhooks com status e failed_attempts.
- [ ] 22.4 Criar edge function `dispatch-webhook`:
  - POST: recebe event, payload, tenant_id
  - Busca webhooks ativos do tenant com evento no array events[]
  - Para cada: POST para webhook_url com payload + X-Webhook-Signature (HMAC SHA256 com secret)
  - Log em webhook_delivery_logs
  - Se falha: schedule retry (attempt 1: 1min, 2: 5min, 3: 30min)
  - Após 3 falhas: marcar webhook como inativo
- [ ] 22.5 Integrar dispatch-webhook nos fluxos existentes: approve-nf-step (nf.approved/rejected), process-scheduled-repasses (repasse.created), check-document-expiry (document.expiring), check-contract-expiry (contract.expiring)
- [ ] 22.6 Criar src/components/api-management/WebhookDeliveryLogs.tsx — tabela: evento, status, attempt, response, timestamp
- [ ] 22.7 Criar src/components/api-management/ApiDocsPage.tsx — documentação interativa: lista endpoints, exemplos request/response, guia auth
- [ ] 22.8 Criar src/pages/ApiDocs.tsx — rota /api-docs
- [ ] 22.9 Adicionar todas as rotas e items de sidebar faltantes da Fase 3
- [ ] 22.10 npm run build
- [ ] 22.11 Commit + push + PR → main
- [ ] 22.12 Deploy edge functions pelo Lovable
- [ ] 22.13 Curl de validação de todas as 5 novas edge functions
- [ ] 22.14 Teste E2E completo no tenant R Bahls
