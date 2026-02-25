

# Email de Confirmacao para Respondente do Formulario

## Objetivo
Enviar automaticamente um email de confirmacao ao usuario que preencher o formulario, com a mensagem: "Seu formulario foi entregue e em breve entraremos em contato."

## Abordagem
Adicionar o envio de email via Resend diretamente na Edge Function `process-form-response`, que ja e disparada automaticamente apos cada submissao. Isso evita criar uma nova function e aproveita o fluxo existente.

## Passo 1 - Configurar a API Key do Resend
Vou solicitar a sua API Key do Resend e armazena-la de forma segura no backend. Ela so sera acessivel pelas funcoes do servidor, nunca exposta no frontend.

## Passo 2 - Atualizar a Edge Function
Adicionar um novo passo (passo 10) na funcao `process-form-response` que envia o email de confirmacao:

- **Destinatario**: email do respondente (extraido da resposta)
- **Remetente**: `noreply@axhub.com.br` (ou outro dominio verificado no Resend)
- **Assunto**: "Confirmacao - Recebemos seu formulario"
- **Corpo**: Email HTML simples e profissional com a mensagem de confirmacao, logo da Axis e nome do respondente

O envio sera feito via chamada HTTP direta a API do Resend (`https://api.resend.com/emails`), usando o secret `RESEND_API_KEY`.

## Alteracoes

| Arquivo | Mudanca |
|---|---|
| Secret `RESEND_API_KEY` | Adicionar a API Key do Resend |
| `supabase/functions/process-form-response/index.ts` | Novo passo 10: envio de email de confirmacao via Resend API |

## Detalhes tecnicos do email

```text
De: Axis CRM <noreply@axhub.com.br>
Para: {respondent_email}
Assunto: Confirmacao - Recebemos seu formulario

Corpo HTML:
- Saudacao com nome do respondente
- Mensagem: "Seu formulario foi entregue e em breve entraremos em contato."
- Rodape com branding Axis
```

O envio e feito com try/catch para nao bloquear o restante do processamento caso o email falhe.

