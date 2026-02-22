
# Parcelas em Contas a Receber

## O que muda

Adicionar ao formulario "Nova Conta a Receber" um campo de **numero de parcelas**. Quando o usuario informar, por exemplo, 12 parcelas com valor total de R$ 1.800 e vencimento em 19/02/2026, o sistema cria automaticamente 12 registros na tabela `receivables`:

- Parcela 1/12 - R$ 150,00 - venc. 19/02/2026
- Parcela 2/12 - R$ 150,00 - venc. 19/03/2026
- Parcela 3/12 - R$ 150,00 - venc. 19/04/2026
- ... e assim por diante

## Comportamento

- O campo "Parcelas" so aparece no modo **criacao** (nao na edicao)
- Valor padrao: 1 (comportamento atual, uma unica parcela)
- O valor total informado e dividido igualmente entre as parcelas
- A descricao de cada parcela recebe o sufixo "(1/12)", "(2/12)", etc.
- O vencimento da primeira parcela e a data informada; as demais avancam 1 mes cada
- Todas as parcelas sao inseridas de uma vez no banco

## Nenhuma alteracao de banco necessaria

A tabela `receivables` ja suporta tudo. Cada parcela e simplesmente um registro individual com sua descricao, valor e vencimento proprios.

## Detalhes tecnicos

### Arquivo: `src/pages/Receivables.tsx`

1. Adicionar campo `installments` ao estado do formulario (padrao "1")
2. No JSX do dialog, adicionar um campo numerico "Parcelas" ao lado de "Vencimento" (grid de 3 colunas: Valor, Vencimento, Parcelas)
3. Mostrar o campo de parcelas apenas quando `editItem` e null (modo criacao)
4. No `handleSave`, quando nao for edicao:
   - Ler `installments` como inteiro (minimo 1)
   - Dividir `amount / installments` (arredondando centavos, ajustando a ultima parcela para cobrir diferenca)
   - Para cada parcela, calcular a `due_date` somando N meses a data base
   - Inserir todas as parcelas em uma unica chamada `supabase.from("receivables").insert([...array])`
   - Descricao de cada parcela: `"${descricao} (1/12)"`, `"${descricao} (2/12)"`, etc.
   - Se for apenas 1 parcela, manter o comportamento atual sem sufixo
