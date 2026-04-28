## Objetivo

Popular o formulário existente **"Questionário de Discovery — Solução de IA para Transcrição e Análise Comercial de Chamadas"** (id `bffad3cc...`, atualmente vazio / status `draft`) com todas as perguntas do PDF anexado e disponibilizá-lo como **modelo reutilizável** dentro da aba Formulários.

## Estrutura das perguntas (10 seções, ~70 perguntas)

Mapeadas diretamente do PDF, mantendo a numeração e títulos das seções:

1. **Objetivo de negócio e escopo esperado** (7 perguntas)
2. **Ambiente Yeastar/PABX** (14 perguntas)
3. **Ambiente Microsoft e sistemas existentes** (10 perguntas)
4. **Dados, gravações e qualidade do áudio** (7 perguntas)
5. **Critérios de análise comercial** (10 perguntas)
6. **Relatórios, dashboards e usuários** (7 perguntas)
7. **Integrações e automações** (6 perguntas)
8. **Segurança, LGPD e governança** (8 perguntas)
9. **Volumetria e dimensionamento financeiro** (7 perguntas)
10. **Piloto, sucesso e próximos passos** (6 perguntas)
11. **Informações mínimas para estimativa** (12 campos resumo — seção opcional)

Tipos atribuídos com base no conteúdo:
- `textarea` para perguntas abertas/descritivas
- `radio` para Sim/Não e escolhas exclusivas (gravação, idiomas, tempo real vs lote, etc.)
- `checkbox` para múltipla escolha (áreas que usarão a solução, tipos de necessidades, formatos de exportação)
- `text` para versões/modelos curtos
- `number` para volumetria (chamadas/mês, horas/mês, qtd vendedores, duração média)
- Todas as perguntas com `required: false` por padrão (questionário de discovery aceita "a confirmar"), exceto algumas-chave (objetivo principal, modelo Yeastar, gravação, volume)

## Implementação

### 1. Criar novo seed (`src/components/forms/discoverySeedData.ts`)

Novo arquivo exportando `DISCOVERY_IA_FORM_CONFIG: FormQuestion[]` com todas as ~70 perguntas mapeadas conforme acima. Mantém a interface `FormQuestion` existente (importada de `formSeedData.ts`).

### 2. Popular o formulário existente no banco

Migration SQL atualizando o registro `bffad3cc-c113-4d8a-b00a-7641d91bde7c`:
- `form_config` ← array completo de perguntas
- `description` ← objetivo conforme PDF
- `status` ← mantém `draft` (usuário publica quando quiser)

### 3. Disponibilizar como modelo na aba Formulários

Em `src/pages/Forms.tsx`, transformar o botão único "Criar Formulário Modelo" em um **dropdown** (ou substituir por um seletor) com 2 opções:
- "Avaliação de Educação Inclusiva" (existente)
- "Questionário de Discovery — IA para Chamadas" (novo)

Ao escolher, insere uma nova cópia do modelo no tenant atual (mesmo padrão do `handleSeedForm` atual, com `form_config: DISCOVERY_IA_FORM_CONFIG`).

## Arquivos afetados

```text
src/components/forms/discoverySeedData.ts   (novo)
src/pages/Forms.tsx                         (botão modelo → dropdown com 2 opções)
supabase/migrations/<timestamp>_*.sql       (popula form_config do form existente)
```

## Detalhes técnicos

- IDs das perguntas: `disc_q1` … `disc_q70` para evitar colisão com outros seeds
- Seções nomeadas exatamente como no PDF (incluindo numeração "1. Objetivo…") para refletir no editor visual
- Sem `subsection` (PDF não usa subsecções relevantes)
- Reutiliza o `FormQuestion` interface — sem novos tipos
- Migration usa `UPDATE forms SET form_config = '[...]'::jsonb WHERE id = 'bffad3cc...'`

Após aprovação eu implemento direto: criar o seed, rodar a migration e atualizar o botão de modelo.