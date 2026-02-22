

# Criar Pipeline Padrao para o Tenant Atual

## Problema
A pagina Pipeline esta funcionando corretamente, mas aparece vazia porque o tenant do usuario logado (`e1a516ab-315c-4c30-b7de-1290a10f965e`) nao tem um pipeline padrao criado. Esse tenant foi criado antes do trigger automatico que gera o pipeline ao criar um novo tenant.

## Solucao
Executar uma migracao SQL para inserir o pipeline padrao e os 4 stages (Qualificacao, Proposta, Negociacao, Fechamento) para esse tenant, seguindo o mesmo padrao dos outros tenants.

## Detalhes tecnicos

### Migracao SQL
Inserir na tabela `sales_pipelines` um registro com `is_default = true` para o tenant `e1a516ab-315c-4c30-b7de-1290a10f965e`, e em seguida inserir os 4 stages na tabela `pipeline_stages` com as mesmas probabilidades e cores padrao usadas nos outros tenants:

```text
1. Qualificacao (order=1, probability=10)
2. Proposta (order=2, probability=30)
3. Negociacao (order=3, probability=60)
4. Fechamento (order=4, probability=90)
```

### Arquivos modificados
Nenhum arquivo de codigo sera alterado. Apenas uma migracao SQL sera criada para popular os dados faltantes.

