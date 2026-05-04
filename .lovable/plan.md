## Respostas e Plano de Ajustes na Landing Page AXIS

### 1. Onde os dados do formulário são gravados

Os leads do formulário "Agende sua demonstração" são salvos na tabela do backend `axis_landing_leads` (Lovable Cloud), via Edge Function `submit-axis-lead`.

Cada envio grava: nome, email, whatsapp, empresa, cargo, tamanho da operação, objetivo principal, mensagem, consentimento LGPD, origem (`landing-axis`), user-agent, status (`novo`) e data.

**Como acessar:** abrir o Backend (Lovable Cloud) → Tabela `axis_landing_leads`. Posso, opcionalmente, criar uma página interna `/admin/leads-landing` (protegida por permissão) para visualizar/exportar esses leads dentro do AXIS — me confirme se quer essa tela.

### 2. Botões "Falar com Suporte" → WhatsApp (11) 93917-1383

Hoje só o FAB flutuante leva ao WhatsApp. Vou padronizar **todos** os CTAs "Falar com Suporte" (header, hero, planos e FAB) para abrir o WhatsApp `+55 11 93917-1383` em nova aba, com mensagem pré-programada contextual:

- Header/Hero: `Olá! Vim pela landing do AXIS e gostaria de falar com o suporte.`
- Planos: `Olá! Tenho interesse no plano AXIS {Start|Growth|Business|Enterprise} e gostaria de falar com o suporte.`
- FAB: `Olá! Gostaria de falar com o suporte AXIS.`

URL final: `https://wa.me/5511939171383?text=...` (mensagem `encodeURIComponent`).

Constante única `SUPPORT_WHATSAPP_URL` em `src/components/landing/supportLink.ts` para reuso.

### 3. Reposicionamento: AXIS = CRM + ERP + Governança + IA (remover RH, manter ERP)

Ajustes de **conteúdo** preservando UX/UI, fontes, cores, espaçamentos e estrutura visual atuais.

#### 3.1 Hero (`LandingHero.tsx`)
- Badge: `Plataforma CRM + ERP + Governança com IA`
- Headline: `O Sistema Operacional das PMEs com CRM, ERP, Governança e` **`Inteligência Artificial`** (azul)
- Subtítulo: texto novo conforme briefing (centraliza CRM, ERP, pipeline, atendimento, WhatsApp, propostas, financeiro, automações, dashboards, governança).
- CTAs: `Falar com Suporte` (WhatsApp) e `Conhecer Soluções` (âncora `#solucoes`).
- Provas: `Operação integrada`, `Governança e rastreabilidade`, `IA nativa`.

#### 3.2 Mockup (`DashboardMockup.tsx`)
4 métricas (em vez de 3):
- Receita prevista: R$ 284k
- Contas a receber: R$ 96k
- Pedidos em aberto: 42
- Leads ativos: 1.248

Status: `CRM ativo`, `ERP ativo`, `WhatsApp ativo`, `Governança ativa`.
Gráfico: rótulo "Pipeline e fluxo financeiro — últimos 30 dias".
Card flutuante IA: `Copiloto IA — 3 insights operacionais gerados`.

#### 3.3 Módulos (`ModulesSection.tsx`)
Título: `6 módulos. 1 plataforma.`
Subtítulo: `Uma plataforma única para conectar vendas, operação, financeiro, atendimento, automações e decisões executivas.`
Cards: **CRM Nativo**, **ERP Integrado**, **Governança Comercial e Operacional**, **WhatsApp IA**, **Automações**, **Copiloto IA** — descrições exatas do briefing.

#### 3.4 Benefícios (`BenefitsSection.tsx`)
Três blocos: `Vendas e operação conectadas`, `Governança com rastreabilidade`, `Visão 360° da empresa`. Sem menção a RH, sem cifras.

#### 3.5 Planos (`PlansSection.tsx`)
Mantém 4 cards, sem preços. Recursos atualizados:
- **Start**: CRM básico, pipeline, clientes, produtos/serviços, propostas simples, tarefas, relatórios essenciais.
- **Growth**: CRM completo, ERP essencial, WhatsApp, múltiplos funis, propostas, pedidos, contas a receber, automações, dashboards.
- **Business** (destacado, navy + selo laranja "Mais indicado"): CRM avançado, ERP completo, governança, IA Premium, automações ilimitadas, dashboards executivos, permissões, integrações, auditoria.
- **Enterprise**: API, integrações avançadas, workflows customizados, SLA consultivo, gerente de conta, auditoria, relatórios executivos, onboarding dedicado.

Todos os botões → WhatsApp suporte (mensagem por plano).

#### 3.6 Formulário (`ContactSection.tsx` + `submit-axis-lead`)
Atualizar opções de "Principal objetivo":
1. Organizar CRM e pipeline
2. Integrar CRM e ERP
3. Controlar propostas, pedidos e financeiro
4. Melhorar atendimento via WhatsApp
5. Automatizar processos com N8N/Zapier/Make
6. Criar governança comercial e operacional
7. Ter dashboards executivos e visão 360°
8. Falar com suporte

Atualizar o `enum` de `OBJETIVOS` no front e na Edge Function (mesmos slugs em ambos).

#### 3.7 Header/Footer/SEO
- Nav: Soluções, Módulos, Benefícios, Planos, Contato.
- `<title>`: `AXIS — CRM + ERP + Governança com IA para PMEs`.
- Meta description alinhada ao novo posicionamento.

### Restrições respeitadas
Sem RH, sem preços/mensalidades, sem checkout, sem botões "Comprar/Assinar". ERP, financeiro, propostas, pedidos, contratos preservados em todas as seções.

### Arquivos a editar
- `src/components/landing/LandingHero.tsx`
- `src/components/landing/DashboardMockup.tsx`
- `src/components/landing/ModulesSection.tsx`
- `src/components/landing/BenefitsSection.tsx`
- `src/components/landing/PlansSection.tsx`
- `src/components/landing/ContactSection.tsx`
- `src/components/landing/LandingHeader.tsx`
- `src/components/landing/WhatsAppFAB.tsx`
- `src/pages/LandingPage.tsx` (title/description)
- `supabase/functions/submit-axis-lead/index.ts` (novos slugs)
- **Novo:** `src/components/landing/supportLink.ts` (URL do WhatsApp + helper de mensagem)