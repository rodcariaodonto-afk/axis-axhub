
# Landing Page AXIS — CRM de Governança Comercial

Criar uma landing page pública profissional para o AXIS, inspirada visualmente no AXIS PRO, com captura segura de leads.

## Mudanças de roteamento

- `src/App.tsx`: 
  - Rota `/` passa a renderizar a nova `LandingPage` pública (sem `ProtectedRoute`)
  - Dashboard movido para `/dashboard` (protegido)
  - Após login no `Auth.tsx`, redirecionar para `/dashboard` em vez de `/`
  - Atualizar redirects internos que apontam para `/` (ex.: sidebar "Dashboard") para `/dashboard`

## Novos arquivos

- `src/pages/LandingPage.tsx` — página única com âncoras `#solucoes`, `#beneficios`, `#planos`, `#contato`
- `src/components/landing/LandingHeader.tsx` — header branco fixo, logo AXIS, nav, botões Login + Falar com Suporte
- `src/components/landing/LandingHero.tsx` — hero 2 colunas, fundo `#EFF6FF`, headline com destaque azul em "Inteligência Artificial", CTAs, 3 provas com check verde
- `src/components/landing/DashboardMockup.tsx` — mockup dark com janela (3 bolinhas, URL `app.axis.com.br`), cards de métricas (Receita R$ 284k, Leads 1.248, Conversão 34%), gráfico de barras SVG, badges (WhatsApp / CRM / Governança ativos), card flutuante "Copiloto IA — 3 insights gerados"
- `src/components/landing/ModulesSection.tsx` — "6 módulos. 1 plataforma." (CRM Nativo, Pipeline, Governança, WhatsApp IA, Automações, Copiloto IA) com ícones lucide
- `src/components/landing/BenefitsSection.tsx` — 3 colunas, marcador laranja, sem promessa monetária
- `src/components/landing/PlansSection.tsx` — 4 planos sem preços (Start, Growth, Business destacado azul-marinho com selo laranja, Enterprise), todos com botão "Falar com Suporte"
- `src/components/landing/ContactSection.tsx` — formulário com validação Zod, honeypot invisível, consentimento LGPD obrigatório, mensagem de sucesso
- `src/components/landing/WhatsAppFAB.tsx` — botão flutuante verde `#25D366` canto inferior direito
- `src/components/landing/LandingFooter.tsx` — footer escuro com links, sem RH

## Backend / Supabase

Migration:
```sql
create table public.axis_landing_leads (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text not null,
  whatsapp text not null,
  empresa text not null,
  cargo text,
  tamanho_operacao text not null,
  objetivo_principal text not null,
  mensagem text,
  consentimento_lgpd boolean not null default false,
  origem text default 'landing-axis',
  user_agent text,
  status text default 'novo',
  created_at timestamptz default now()
);
alter table public.axis_landing_leads enable row level security;
-- Sem policies de SELECT públicas. Insert apenas via edge function (service role).
```

Edge function `submit-axis-lead` (`verify_jwt = false`, com Zod):
- Valida nome (3-120), email, whatsapp (10-15 dígitos), empresa, tamanho_operacao (whitelist), objetivo_principal (whitelist), consentimento_lgpd === true
- Honeypot: se campo `website` vier preenchido, retorna 200 silencioso (não grava)
- Sanitiza/trima strings, limita comprimentos
- Captura `user_agent` do header
- Insere via service role
- Retorna apenas `{ ok: true }` ou erro genérico

Frontend chama via `supabase.functions.invoke('submit-axis-lead')`.

## Conteúdo (todas as restrições aplicadas)

- Sem RH, colaboradores, folha, PDI, ponto, recrutamento
- Sem preços, mensalidades, descontos, "30 dias grátis", checkout
- Linguagem em português; "usuários" em vez de "funcionários"
- Headline: "O CRM de Governança para empresas que vendem com processo, controlo e **Inteligência Artificial**"
- Subtítulo, módulos, benefícios, planos, formulário e mensagens de sucesso conforme especificado no briefing

## Design tokens locais (escopo na landing)

A landing usa paleta clara, mas o resto do app continua com tema dark. Para evitar conflito com `index.css` (que define `--background` dark), os componentes da landing usarão classes Tailwind explícitas com cores hex/arbitrary values (`bg-[#EFF6FF]`, `text-[#0F172A]`, `bg-[#3B82F6]`, `bg-[#25D366]`, `text-[#4B5563]`, accent `#F97316`) e fontes Plus Jakarta Sans (headings) + Inter (body) carregadas via `<link>` no `index.html`.

## SEO

- `index.html`: title `AXIS — CRM de Governança Comercial com IA`, meta description, OG tags atualizadas, fontes Google
- Estrutura semântica: `<header>`, `<main>`, `<section>` com `aria-labelledby`, headings em ordem, labels em todos os inputs, foco visível

## Acessibilidade & responsividade

- Grid 2 col desktop / 1 col mobile no hero, módulos (3x2), planos (4 col / 2 col / 1 col), formulário (2 col / 1 col)
- Contraste AA, navegação por teclado, `aria-label` no FAB do WhatsApp
- Animações discretas com Tailwind transitions

## Critérios de aceite

- `/` carrega landing pública sem auth; `/dashboard` exige login
- Formulário grava em `axis_landing_leads` apenas via edge function; RLS bloqueia leitura pública
- Nenhuma menção a RH ou preços
- Layout responsivo testado em mobile/tablet/desktop
