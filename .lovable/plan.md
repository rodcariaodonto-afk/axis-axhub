## Plano: Criar formulário "MVP SEI - Serviço de Estoque Inteligente"

Vou criar um novo formulário no módulo Forms do AXIS com as 20 perguntas do PDF, no tenant ativo do usuário. O formulário ficará disponível em `/forms` para edição e publicação (link público).

### Estrutura do formulário

**Nome:** MVP SEI — Serviço de Estoque Inteligente
**Descrição:** Questionário de diagnóstico para validação do MVP do Serviço de Estoque Inteligente com óticas piloto.
**Status inicial:** rascunho (publicação fica a critério do usuário no editor)

### Seções e perguntas

**Seção 1 — Objetivo e Piloto** (Q1–Q3)
- Q1: Objetivo principal do SEI (textarea, obrigatório)
- Q2: Quantidade de óticas e critérios de seleção (textarea, obrigatório)
- Q3: Perfil ideal da ótica piloto (textarea, obrigatório)

**Seção 2 — ERPs e Dados** (Q4–Q7)
- Q4: ERPs utilizados (textarea, obrigatório)
- Q5: Acesso a API/exportação por ERP (textarea, obrigatório)
- **Q6: Relatórios/bases de dados disponíveis (checkbox múltipla escolha + campo "Outros")**
  - Opções: Produtos, SKUs, Estoque atual, Vendas, Compras, CMV, Fornecedores, Preços, Custos, Movimentações
  - **Campo adicional "Outros (especifique)"** em texto livre, para complementar itens fora da lista
- Q7: Detalhe SKU por atributos (textarea, obrigatório)

**Seção 3 — Histórico e Problemas** (Q8–Q10)
- **Q8: Histórico mínimo necessário (radio + campo numérico de quantidade mínima de estoque)**
  - Opções: 3 meses, 6 meses, 12 meses, mais de 12 meses
  - **Campo adicional numérico "Quantidade mínima de estoque (unidades)"**
- Q9: Problemas críticos de estoque (textarea, obrigatório)
- Q10: Cobertura ideal de referência (textarea, obrigatório)

**Seção 4 — Cálculos e Regras** (Q11–Q15)
- Q11: Como calcula CMV, cobertura, ruptura, excesso, reposição (textarea)
- Q12: Regras de personalização por tipo de loja (textarea)
- Q13: Recomendação por SKU/categoria/marca/fornecedor (textarea)
- Q14: Dados externos considerados (textarea)
- Q15: Frequência ideal da análise (radio: Semanal, Quinzenal, Mensal, Sob demanda)

**Seção 5 — MVP, Entregáveis e Investimento** (Q16–Q20)
- Q16: Usuário principal da ferramenta no MVP (textarea)
- Q17: Entregável principal do MVP (textarea)
- Q18: Decisões com validação humana (textarea)
- Q19: Impacto financeiro em 90 dias (textarea)
- Q20: Faixa de investimento (radio: até R$10k, R$10–30k, R$30–60k, R$60–100k, acima de R$100k)

### Detalhes técnicos

- Inserção via SQL `INSERT` na tabela `forms` (tenant atual do usuário) com `form_config` em JSON seguindo o tipo `FormQuestion` já usado no editor (`src/components/forms/formSeedData.ts` / `src/pages/FormEditor.tsx`).
- Cada pergunta terá `id`, `section`, `label`, `type` (`text` | `textarea` | `radio` | `checkbox`), `required`, `options?`.
- Q6: pergunta `checkbox` + segunda pergunta `text` ("Outros — especifique") logo abaixo.
- Q8: pergunta `radio` + segunda pergunta `number` ("Quantidade mínima de estoque (unidades)") logo abaixo.
- Sem alteração de schema, sem edge function — só inserção de dados.
- Após criação, o formulário aparece em `/forms` para edição visual e publicação pelo usuário.

### Confirmação necessária

Para inserir, preciso confirmar o tenant. Vou usar o tenant do usuário logado (consultado via `get_user_tenant_id()` quando rodar o INSERT, ou se preferir, posso usar o tenant fixo de Rodrigo `7df9b3e1-4a54-4b72-bf42-4c2de3ef36ad` já referenciado em outras partes do projeto). Confirme qual usar ao aprovar o plano.
