## Plano: Criar formulário "Questionário AXIS — Diagnóstico Rhaisa Amaral"

Inserir um novo formulário no módulo Forms (tabela `forms`), tenant `7df9b3e1-4a54-4b72-bf42-4c2de3ef36ad`, status `draft`, com 25 perguntas organizadas em 6 blocos conforme o PDF.

### Estrutura

**Bloco 1 — Contexto, oferta e ativos** (Q1–Q6)
- Q1: O que vende e para quem (textarea, obrigatório)
- Q2: Principal produto em faturamento — ticket, ciclo, renovação, churn (textarea, obrigatório)
- Q3: Produtos/serviços ativos com marcação M/E/I (textarea, obrigatório)
- Q4: Ativos prontos disponíveis (checkbox: Metodologia, Frameworks, Apresentações comerciais, Conteúdos educacionais, Cases/provas, Base de leads, Scripts comerciais, Templates de entrega) + campo "Outros" (text)
- Q5: Central Diamond — estágio, volume, ticket, modelo de cobrança (textarea, obrigatório)
- Q6: Transformação concreta entregue + como prova (textarea, obrigatório)

**Bloco 2 — Operação e gargalos reais** (Q7–Q12)
- Q7: Processo ponta-a-ponta (textarea, obrigatório)
- Q8: Onde perde mais tempo manual + tarefas WhatsApp (textarea, obrigatório)
- Q9: Onde perde mais clientes/oportunidades (textarea, obrigatório)
- Q10: Horas/semana em tarefas repetitivas (radio: <5h, 5–10h, 10–20h, >20h) + Q10b: % que IA poderia absorver (text)
- Q11: Como funciona Notion/Drive com clientes (textarea, obrigatório)
- Q12: UM único problema operacional prioritário (textarea, obrigatório)

**Bloco 3 — Entrega, indicadores e prova** (Q13–Q15)
- Q13: KPIs do diagnóstico e mensais (textarea, obrigatório)
- Q14: Formato do relatório mensal (radio: PDF manual, Planilha Excel, Notion, Apresentação ao vivo, Outro) + Q14b: tempo + o que mais odeia (textarea)
- Q15: Cases documentados — formato e uso (textarea, obrigatório)

**Bloco 4 — Ecossistema, sócio e estrutura futura** (Q16–Q19)
- Q16: Parceiros ativos, remuneração, frequência (textarea, obrigatório)
- Q17: Divisão com o marido sócio + impacto no prazo (textarea, obrigatório)
- Q18: Plataforma de cursos — qual, status, alunos, integração com AXIS (textarea, obrigatório)
- Q19: Mentoria 100+ consultores — dor tecnológica e potencial de revenda (textarea, obrigatório)

**Bloco 5 — Visão estratégica e escala** (Q20–Q21)
- Q20: Onde quer estar em 12 meses (MRR, clientes, equipe, produtos) (textarea, obrigatório)
- Q21: Maior obstáculo (radio: Captação, Conversão, Capacidade de entrega, Padronização, Tecnologia, Equipe, Outros)

**Bloco 6 — Stack, investimento e compromisso** (Q22–Q25)
- Q22: Ferramentas atuais com marcação S/T/Q (textarea, obrigatório)
- Q23a: Investimento inicial (radio: até R$10k, R$10–25k, R$25–50k, R$50–100k, acima R$100k)
- Q23b: Mensalidade recorrente (radio: até R$500, R$500–1.5k, R$1.5–3k, R$3–6k, acima R$6k)
- Q24: Forma de pagamento (radio: Integral à vista, Parcelado 3–6x, Entrada + mensalidade, Híbrido com participação)
- Q25a: Nível de dor 0–10 (number, obrigatório)
- Q25b: Disponibilidade 3h/semana (radio: Sim com prioridade, Sim com esforço, Não tenho)
- Q25c: "Pagaria por uma plataforma que..." (textarea)
- Q25d: "Nunca pagaria por uma plataforma que..." (textarea)

### Detalhes técnicos

- INSERT único na tabela `public.forms` com `form_config` JSONB seguindo o tipo `FormQuestion` (mesma estrutura de `formSeedData.ts`).
- Tipos: `text`, `textarea`, `radio`, `checkbox`, `number`.
- Tenant: `7df9b3e1-4a54-4b72-bf42-4c2de3ef36ad`. Status: `draft`. Após inserção, formulário fica disponível em `/forms` para edição/publicação.
- Sem alteração de schema, sem edge function.
