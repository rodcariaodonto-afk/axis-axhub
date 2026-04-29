# Identificação ampliada no formulário público

Hoje, o passo "Identifique-se" do formulário público (`/f/:code`) coleta apenas **Nome** e **E-mail**. Para o formulário **Inscrição Connect** é preciso coletar mais dados antes de o respondente acessar as perguntas.

## Escopo

A identificação ampliada será aplicada **a todos os formulários públicos** (não só ao Inscrição Connect). Vantagens:

- Padroniza a coleta de dados de contato em todas as inscrições futuras.
- Não exige nova coluna no banco nem alteração caso-a-caso por formulário.
- O formulário "Inscrição Connect" já passa a coletar tudo automaticamente.

Se preferir aplicar **somente** ao Inscrição Connect, posso condicionar pelo `unique_code` — me avise antes da aprovação.

## Campos solicitados

| Campo | Tipo | Validação |
|---|---|---|
| Nome Completo | texto | mínimo 3 caracteres, obrigatório |
| CPF ou CNPJ | texto com máscara automática | 11 dígitos (CPF) ou 14 dígitos (CNPJ), obrigatório |
| Empresa | texto | obrigatório |
| Telefone | texto com máscara `(XX) XXXXX-XXXX` | 10 ou 11 dígitos, obrigatório |
| E-mail | email | formato de e-mail válido, obrigatório |

## Onde os dados ficam salvos

A tabela `form_responses` só possui colunas nativas para `respondent_name` e `respondent_email`. Os demais campos serão persistidos dentro do JSONB `response_data` sob a chave reservada `__identificacao`:

```json
{
  "__identificacao": {
    "nome": "Maria Silva",
    "documento": "12345678900",
    "documento_tipo": "cpf",
    "empresa": "Acme Ltda",
    "telefone": "11987654321",
    "email": "maria@acme.com"
  },
  "<question_id_1>": "...",
  "<question_id_2>": "..."
}
```

Os campos `respondent_name` e `respondent_email` continuam sendo preenchidos (nome e e-mail) para compatibilidade com a listagem existente em `/forms/:id/responses`.

## Mudanças técnicas

### 1. `src/pages/PublicForm.tsx`
- Substituir os dois `useState` (`respondentName`, `respondentEmail`) por um único objeto `identify` com 5 campos + `documentType` ('cpf' | 'cnpj').
- Reescrever o card de identificação com os 5 inputs.
- **Máscara de documento**: usar `formatDocument` / `stripDocument` / `detectDocumentType` já existentes em `src/lib/documentMask.ts`. Em cada keystroke detecta CPF (≤11 dígitos) ou CNPJ (até 14) e aplica a máscara.
- **Máscara de telefone**: criar uma função local simples `formatPhoneBR(value)` que aplica `(XX) XXXXX-XXXX` (ou `(XX) XXXX-XXXX` se 10 dígitos). Não há util genérico de telefone no projeto.
- **Validação com Zod** (já usado em outras páginas):
  - `nome`: `z.string().trim().min(3, "Informe seu nome completo")`
  - `documento`: refinar para aceitar somente 11 ou 14 dígitos numéricos
  - `empresa`: `z.string().trim().min(1, "Empresa é obrigatória")`
  - `telefone`: refinar para 10 ou 11 dígitos numéricos
  - `email`: `z.string().trim().email("E-mail inválido")`
- Mensagens de erro exibidas inline abaixo de cada campo (texto pequeno, vermelho usando `text-destructive`).
- `handleIdentify` só avança ao passo `form` se `safeParse` passar.
- `handleSubmit` injeta o objeto `__identificacao` em `response_data` antes do insert.
- O resumo "Respondendo como: <nome>" continua mostrando apenas o nome; o link "Editar" volta para a tela de identificação preservando os valores já preenchidos.

### 2. Nenhuma alteração de banco
- Sem migrations. `response_data` é JSONB e aceita o novo objeto livremente.
- RLS, triggers, edge function `process-form-response` continuam funcionando — `__identificacao` fica disponível para uso futuro (ex.: pré-preencher Lead/Account com CPF/CNPJ, telefone, empresa).

### 3. Sem alteração em outras telas
- `FormResponses.tsx` segue listando nome/e-mail nativos.
- O builder de formulários (`FormEditor`) não muda — esses 5 campos são da etapa de identificação, separada das perguntas configuráveis.

## Fora do escopo

- Validação avançada de CPF/CNPJ (dígitos verificadores). Hoje só validamos contagem de dígitos. Posso adicionar a validação completa se solicitado.
- Mapeamento automático de CPF/CNPJ/empresa/telefone para entidades CRM (Lead/Account/Contact). A edge function `process-form-response` já cria Lead a partir das perguntas configuradas; um aprimoramento posterior pode usar `__identificacao` como fallback.
