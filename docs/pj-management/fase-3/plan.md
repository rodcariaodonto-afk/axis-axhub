# Plano Técnico: Gestão de PJ — Fase 3 (Otimização)

## 1. Fluxo de Implementação (8 Slices)

### Slice 15 — Schema Fase 3
**Objetivo:** Todas as tabelas e ALTERs da Fase 3 no banco.
**Saída:** Migration aplicada, 6 novas tabelas + ALTERs em 5 tabelas existentes.
**Branch:** `feature/pj-management-slice15-schema-f3`

### Slice 16 — Validação SEFAZ
**Objetivo:** Consulta SEFAZ funcional, badge na UI, revalidação.
**Saída:** Edge function validate-nf-sefaz, SefazValidationBadge, toggle no config.
**Branch:** `feature/pj-management-slice16-sefaz`

### Slice 17 — Dados Bancários + PIX
**Objetivo:** Cadastro de dados bancários do PJ, geração de payload/QR PIX.
**Saída:** PJBankDataForm, PixPayloadGenerator, edge function generate-pix-payload.
**Branch:** `feature/pj-management-slice17-bank-pix`

### Slice 18 — Conciliação Bancária
**Objetivo:** Marcação de pagamento, comparação de valores, dashboard.
**Saída:** ConciliationForm, ConciliationDashboard, BankDashboard.
**Branch:** `feature/pj-management-slice18-conciliation`

### Slice 19 — Avaliação de PJ: Config + Formulário
**Objetivo:** Admin configura critérios e avalia PJs.
**Saída:** EvaluationCriteriaConfig, EvaluationForm, EvaluationHistory.
**Branch:** `feature/pj-management-slice19-evaluation`

### Slice 20 — Avaliação de PJ: Score + Ranking
**Objetivo:** Score composto calculado, ranking, dashboard, portal PJ.
**Saída:** calculate-pj-score, PJRankingDashboard, ScoreEvolutionChart, portal view.
**Branch:** `feature/pj-management-slice20-ranking`

### Slice 21 — API Pública: Gateway + Keys
**Objetivo:** API gateway funcional, gestão de API keys, endpoints REST.
**Saída:** api-gateway edge function, ApiKeyManager, endpoints PJ/NF/repasse/docs.
**Branch:** `feature/pj-management-slice21-api`

### Slice 22 — API Pública: Webhooks + Docs + Integração Final
**Objetivo:** Webhooks com retry, documentação, logs, teste E2E completo.
**Saída:** dispatch-webhook, WebhookConfig, ApiDocsPage, teste E2E.
**Branch:** `feature/pj-management-slice22-webhooks`

---

## 2. Dependências

```
Slice 15 (Schema) ──→ Slice 16 (SEFAZ)
                  ──→ Slice 17 (Bank) ──→ Slice 18 (Conciliação)
                  ──→ Slice 19 (Eval) ──→ Slice 20 (Ranking)
                  ──→ Slice 21 (API) ──→ Slice 22 (Webhooks)
```

---

## 3. Edge Functions

| Função | Slice | Tipo |
|---|---|---|
| validate-nf-sefaz | 16 | POST |
| generate-pix-payload | 17 | POST |
| calculate-pj-score | 20 | POST |
| api-gateway | 21 | POST/GET |
| dispatch-webhook | 22 | POST |
