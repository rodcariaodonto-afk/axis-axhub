

# Ajuste no Campo de Parcelas - Valor por Parcela

## O que muda

Atualmente, o valor informado no campo "Valor" e tratado como o **total**, que e dividido pelo numero de parcelas. O usuario quer o contrario: o valor informado e o **valor de cada parcela**, e o sistema cria N registros com esse mesmo valor.

Exemplo: Valor R$ 1.800 com 12 parcelas = 12 registros de R$ 1.800 cada (total R$ 21.600).

## Alteracao

### Arquivo: `src/pages/Receivables.tsx`

Na funcao `handleSave`, no bloco de criacao (nao-edicao), trocar a logica de divisao por repeticao:

**Antes:** `baseAmount = totalAmount / numInstallments` (divide o valor)
**Depois:** cada parcela recebe exatamente `parseFloat(form.amount)` (repete o valor)

Remover as variaveis `baseAmount` e `isLast` que tratavam arredondamento de divisao. Cada parcela tera o mesmo valor fixo informado no campo.

O restante (sufixo na descricao, incremento mensal do vencimento, insert em lote) permanece igual.

