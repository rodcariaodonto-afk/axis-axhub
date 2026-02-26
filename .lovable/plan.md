

# Plano: Inserir 5 Templates Pre-configurados de Contratos

## Objetivo
Adicionar um botao "Criar Templates Modelo" na pagina de Templates de Contratos que insere automaticamente 5 templates pre-configurados com macros `{{ }}` prontos para uso.

## Abordagem
Implementar a logica diretamente no frontend (botao na pagina `ContractTemplates.tsx`) que verifica se os templates modelo ja existem e, caso nao, insere os 5 templates com conteudo completo.

## Templates a Inserir

| Nome | Tipo | Descricao |
|------|------|-----------|
| Contrato de Venda | sales | Template padrao para contratos de venda de produtos ou servicos |
| Contrato de Servico | service | Template padrao para contratos de prestacao de servicos |
| Contrato de Fornecimento | supply | Template padrao para contratos com fornecedores |
| Acordo de Confidencialidade (NDA) | nda | Template padrao para Acordo de Confidencialidade |
| Contrato de Parceria | custom | Template padrao para contratos de parceria comercial |

Cada template tera conteudo completo com macros como `{{account_name}}`, `{{account_cnpj}}`, `{{contact_name}}`, `{{deal_value}}`, `{{contract_start_date}}`, `{{contract_end_date}}`, `{{current_date_full}}`, `{{user_name}}`, etc.

## Alteracoes

| Arquivo | Acao |
|---------|------|
| `src/pages/ContractTemplates.tsx` | Editar - adicionar botao "Criar Templates Modelo" + funcao de seed |

### Detalhes Tecnicos

- Botao permanece sempre visivel (padrao do projeto conforme memoria de UX)
- Ao clicar, busca `tenant_id` e `user.id`, insere os 5 templates via `supabase.from("contract_templates").insert([...])`
- Usa `upsert` ou verifica duplicatas pelo nome antes de inserir
- Toast de sucesso informando quantos templates foram criados
- Recarrega a listagem apos insercao

