

# Implementacao Completa - Itens Pendentes do Documento

## Resumo dos Gaps Identificados

| Item | Area | Status Atual | O que Falta |
|------|------|-------------|-------------|
| 7 | Auditoria & Governanca | Parcial | Visualizacao de before/after JSON, mais entidades no filtro |
| 6 | Workflows | Base pronta | 15+ templates pre-construidos (Lead Nurturing, Follow-up, Cobranca, etc) |
| 5 | Notificacoes | In-App OK | Mais tipos de notificacao (lead qualificado, proposta aceita/rejeitada, pedido enviado, etc) |
| 4 | Relatorios | CSV/PDF OK | Exportacao Excel (XLSX), funcionalidade de agendamento de relatorios |
| 2 | Integracoes | 10 conectores | Expandir catalogo para 25+ conectores (MS Teams, Calendly, SendGrid, Twilio, etc) |
| 1 | Documentacao | Arquitetura OK | Conteudo real: guias por nicho, FAQ, glossario (seed de dados) |

## Item 7 - Auditoria & Governanca

### Melhorias no AuditLogsView

- Adicionar linhas expansiveis que mostram o JSON `before_json` e `after_json` formatado (diff visual)
- Adicionar mais entidades no filtro (leads, deals, orders, customers, workflows, notifications)
- Adicionar filtro por data (range picker)
- Mostrar nome do usuario ao inves de apenas UUID (join com profiles)
- Adicionar exportacao CSV dos logs

### Arquivos alterados
- `src/pages/settings/AuditLogsView.tsx` - Reescrever com linhas expansiveis e filtros avancados

---

## Item 6 - Workflow Templates Pre-construidos

### Criar 15 templates prontos para uso

Os templates serao constantes no frontend que pre-populam o builder com nodes e edges ja configurados:

**Vendas (5):**
1. Lead Nurturing - Trigger: lead.created -> Condicao: score > 50 -> Acao: criar notificacao + criar atividade de follow-up
2. Follow-up Automatico - Trigger: deal.stage_changed -> Acao: criar atividade de ligacao
3. Fechamento de Deal - Trigger: deal.won -> Acao: criar notificacao + criar tarefa de onboarding
4. Perda de Oportunidade - Trigger: deal.lost -> Acao: criar notificacao + adicionar tag "perdido"
5. Qualificacao de Lead - Trigger: lead.updated -> Condicao: score > 80 -> Acao: atualizar status para "qualified"

**Operacoes (4):**
6. Novo Pedido - Trigger: order.created -> Acao: criar notificacao + criar tarefa
7. Pedido Pago - Trigger: order.paid -> Acao: criar notificacao
8. Novo Cliente - Trigger: customer.created -> Acao: criar notificacao de boas-vindas + criar atividade
9. Alerta de Integracao - Trigger: manual -> Acao: enviar webhook

**Financeiro (3):**
10. Cobranca Automatica - Trigger: manual -> Acao: criar notificacao de cobranca
11. Alerta Financeiro - Trigger: order.paid -> Acao: criar notificacao para financeiro
12. Reconciliacao - Trigger: order.paid -> Condicao: campo igual -> Acao: criar tarefa

**Marketing (3):**
13. Segmentacao de Lead - Trigger: lead.created -> Condicao: campo contem -> Acao: adicionar tag
14. Reengajamento - Trigger: manual -> Acao: criar atividade + criar notificacao
15. Campanha Follow-up - Trigger: lead.updated -> Condicao: campo nao vazio -> Acao: criar atividade

### Arquivos alterados/criados
- `src/components/workflows/workflowTemplates.ts` - Novo arquivo com 15 templates
- `src/components/workflows/WorkflowList.tsx` - Adicionar botao "Criar a partir de template" com modal de selecao
- `src/components/workflows/WorkflowTemplateSelector.tsx` - Novo componente modal para escolher template

---

## Item 5 - Notificacoes Adicionais

### Expandir tipos de notificacao de 17 para 25+

Novos tipos a adicionar:
- `lead_qualified` - Lead Qualificado (sales)
- `proposal_accepted` - Proposta Aceita (sales)
- `proposal_rejected` - Proposta Rejeitada (sales)
- `deal_stage_approaching` - Deal Proximo do Fechamento (sales)
- `order_shipped` - Pedido Enviado (operations)
- `order_delivered` - Pedido Entregue (operations)
- `stock_out` - Produto Sem Estoque (operations)
- `return_received` - Devolucao Recebida (operations)
- `payment_overdue_critical` - Pagamento Critico Vencido (financial)
- `backup_completed` - Backup Concluido (system)
- `maintenance_scheduled` - Manutencao Programada (system)

### Arquivos alterados
- `src/components/notifications/notificationTypes.ts` - Adicionar novos tipos

---

## Item 4 - Relatorios: Excel Export + Agendamento

### Exportacao Excel
- Adicionar botao "Excel" na ReportExportBar
- Gerar arquivo XLSX client-side usando uma abordagem leve (gerar XML do formato Excel sem dependencia pesada, usando template SpreadsheetML)

### Agendamento de Relatorios
- Criar tabela `report_schedules` (id, tenant_id, report_id, frequency, recipients_emails, next_run_at, is_active, created_by)
- Adicionar UI de agendamento no ReportViewer (frequencia: diaria/semanal/mensal + emails destinatarios)
- Nota: o envio real por email dependera de integracao com servico de email externo; a infraestrutura de agendamento ficara pronta

### Arquivos alterados/criados
- `src/components/reports/ReportExportBar.tsx` - Adicionar botao Excel + logica de geracao XLSX
- `src/components/reports/ReportScheduleDialog.tsx` - Novo componente para configurar agendamento
- `src/pages/Reports.tsx` - Integrar dialog de agendamento
- Migracao SQL para tabela `report_schedules`

---

## Item 2 - Expandir Catalogo de Integracoes

### Adicionar 15+ novos conectores ao catalogo

Novos conectores:
1. Microsoft Teams (communication, webhook)
2. Google Workspace (productivity, oauth2)
3. Mailchimp (communication, api_key)
4. WooCommerce (erp, api_key)
5. Calendly (productivity, api_key)
6. Google Sheets (productivity, oauth2)
7. Airtable (productivity, api_key)
8. Salesforce (crm, oauth2)
9. Twilio SMS (communication, api_key)
10. SendGrid (communication, api_key)
11. PayPal (payment, api_key)
12. Melhor Envio (erp, api_key) - logistica
13. PipeDrive (crm, api_key)
14. RD Station (crm, api_key)
15. Tiny ERP (erp, api_key)
16. Bling ERP (erp, api_key)
17. Asaas (payment, api_key)

Tambem adicionar nova categoria "logistics" ao catalogo.

### Arquivos alterados
- `src/components/integrations/connectorsCatalog.ts` - Adicionar 17 novos conectores + categoria logistics

---

## Item 1 - Documentacao: Conteudo Real

### Seed de conteudo via SQL INSERT

Inserir dados reais na tabela `documentation` cobrindo:

**Guia Geral (3 artigos):**
- Primeiros Passos com o AXHUB
- Boas Praticas de Uso
- Glossario de Termos

**Guias por Nicho (7 x 2 artigos = 14 artigos):**
- Varejo: Cadastro de Produtos, Processamento de Pedidos
- Servicos: Gestao de Leads, Pipeline Consultivo
- Saude: Gestao de Pacientes, Agendamentos
- Manufatura: Controle de Estoque, Gestao de Fornecedores
- B2B: Vendas Corporativas, Gestao de Contas
- Imobiliario: Cadastro de Propriedades, Acompanhamento de Vendas
- Educacao: Gestao de Alunos, Controle de Matriculas

**FAQ (10 perguntas mais comuns):**
- Como criar meu primeiro lead?
- Como configurar meu pipeline?
- Como gerar relatorios?
- Como configurar integracoes?
- Como gerenciar estoque?
- (mais 5)

Total: ~27 artigos de documentacao com conteudo em Markdown.

Nota: O seed sera feito via ferramenta de insercao de dados (nao migracao). Sera necessario um tenant_id e user_id validos, que serao obtidos do banco na hora da implementacao.

---

## Sequencia de Implementacao

1. Migracao: tabela `report_schedules`
2. Codigo paralelo:
   - `connectorsCatalog.ts` (expandir conectores)
   - `notificationTypes.ts` (expandir tipos)
   - `workflowTemplates.ts` + `WorkflowTemplateSelector.tsx` (templates de workflow)
   - `ReportExportBar.tsx` (Excel export)
   - `ReportScheduleDialog.tsx` (agendamento)
   - `AuditLogsView.tsx` (melhorias)
   - `WorkflowList.tsx` (integrar templates)
3. Seed de documentacao (INSERT de artigos)

## Observacoes Importantes

- **Item 3 (Mobile App)**: Nao sera implementado - requer React Native/Flutter, fora do escopo Lovable
- **Notificacoes multi-canal** (Email, SMS, WhatsApp, Slack): A infraestrutura in-app esta completa. Canais externos requerem integracao com servicos pagos (SendGrid, Twilio, Evolution API) que podem ser adicionados futuramente via Edge Functions
- **Excel export**: Sera implementado com geracao de XML SpreadsheetML puro, sem dependencia adicional
- **Seed de documentacao**: Conteudo em portugues, formatado em Markdown, com categorias e subcategorias organizadas por nicho

