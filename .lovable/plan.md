# Novo Modelo: Questionário Executivo — IA para Chamadas

Adicionar um terceiro template de formulário com as 21 perguntas em múltipla escolha do PDF anexado, mantendo o padrão dos modelos existentes (Educação Inclusiva e Discovery IA).

## Diferença x Discovery IA
O modelo "Discovery IA" já existente é o questionário **longo/detalhado** (102 perguntas, textarea/text). Este novo é a versão **executiva enxuta** (21 perguntas), 100% em opções selecionáveis (radio/checkbox), feita para preenchimento rápido por clientes finais.

## Mudanças

### 1. Novo arquivo de seed
`src/components/forms/discoveryExecutivoSeedData.ts`

Exporta `DISCOVERY_EXECUTIVO_FORM_CONFIG: FormQuestion[]` com as 21 perguntas mapeadas:

- **Q1–Q3** (Objetivo / áreas / volume de usuários) — `radio` e `checkbox`
- **Q4–Q12** (Ambiente Yeastar: edição, firmware, gravações, armazenamento, acesso, CDR, volume, tipo de chamada, qualidade) — `radio` (com texto auxiliar onde houver "Outro")
- **Q13–Q16** (Microsoft Teams, licenças MS, CRM, integração CRM) — `radio` e `checkbox`
- **Q17–Q19** (Critérios de avaliação IA, escala de nota, indicadores do dashboard) — `checkbox` e `radio`
- **Q20** (LGPD / restrições) — `checkbox`
- **Q21** (PoC / próximo passo — pergunta final) — `radio`

Sections (4 grupos) para melhor organização visual:
1. "Objetivo e Escopo" (Q1–Q3)
2. "Ambiente Yeastar / Telefonia" (Q4–Q12)
3. "Ambiente Microsoft e CRM" (Q13–Q16)
4. "Análise Comercial, Indicadores e LGPD" (Q17–Q20)
5. "Próximo passo (PoC)" (Q21)

### 2. `src/pages/Forms.tsx` — atualizar template selector

- Importar `DISCOVERY_EXECUTIVO_FORM_CONFIG`.
- Estender `template: "education" | "discovery"` → adicionar `"discovery_exec"`.
- Adicionar entrada no `templates` map com nome:
  *"Questionário Executivo — IA para Transcrição e Análise de Chamadas"*
  e descrição: *"Versão executiva enxuta (múltipla escolha) para levantamento rápido com o cliente."*
- Adicionar 3º `DropdownMenuItem` no dropdown "Criar Formulário Modelo".

### 3. Provisionar para o tenant atual
Após o build, inserir uma linha em `public.forms` para o tenant `rodrigo.axhub@gmail.com` (status `published`, `form_config` = novo array, categoria `prospecting`), via insert tool — assim o formulário já aparece na aba Formulários sem precisar clicar no botão modelo.

## Notas técnicas
- Reutilizamos o tipo `FormQuestion` de `formSeedData.ts` — sem mudanças no FormEditor/PublicForm.
- Onde o PDF tem "Outro: ______", mantemos como opção do checkbox/radio (sem campo texto extra) para manter consistência com os modelos atuais; o usuário pode complementar via observação no preenchimento.
- Nenhuma migração de schema; nenhuma edge function alterada.
