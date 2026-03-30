

## Melhorias no Cadastro de Contas: CEP Automático, Dropdowns de Cidade/Estado e Exclusão de Duplicata

### 1. Excluir conta duplicada "Cleide"

Usar o insert tool para soft-delete (is_active = false) na conta duplicada `9cbd1ad8-8fc8-453d-8a8c-53f4cce12d39` (a mais recente das duas).

### 2. Busca automática por CEP (ViaCEP API)

Nos dois arquivos de formulário (`Accounts.tsx` e `AccountDetail.tsx`):
- Ao digitar/colar CEP com 8 dígitos (ou formato 00000-000), chamar `https://viacep.com.br/ws/{cep}/json/`
- Auto-preencher: Endereço (logradouro + bairro), Cidade, Estado, País ("Brasil")
- Mostrar loading spinner no campo CEP durante a busca
- Mover o campo CEP para **antes** dos campos de Endereço, Cidade e Estado na ordem do formulário

### 3. Dropdown de Estado com todos os 27 UFs brasileiros

- Substituir o `<Input>` de Estado por um `<Select>` com as 27 UFs (AC, AL, AM, ..., TO)
- Exibir nome completo + sigla (ex: "Mato Grosso do Sul (MS)")
- Valor armazenado: sigla (ex: "MS")

### 4. Dropdown de Cidade filtrado por Estado

- Usar lista estática dos municípios brasileiros seria muito pesada (~5570 cidades)
- Alternativa: usar a API do IBGE (`https://servicodados.ibge.gov.br/api/v1/localidades/estados/{UF}/municipios`) para carregar cidades dinamicamente quando o estado é selecionado
- Substituir o `<Input>` de Cidade por um `<Select>` com busca (ou Combobox) populado pela API
- Ao selecionar via CEP, o estado e cidade são preenchidos automaticamente

### Arquivos modificados
- `src/pages/Accounts.tsx` — formulário de criação/edição: reordenar campos, CEP com fetch, dropdowns estado/cidade
- `src/pages/AccountDetail.tsx` — mesmo formulário de edição: mesmas mudanças
- Dados: soft-delete da conta duplicada via insert tool

### Ordem dos campos de endereço (novo layout)
```text
CEP          | País
Endereço (rua, número)
Cidade       | Estado
```

### Detalhes técnicos
- ViaCEP é gratuita e não requer API key
- API IBGE de municípios é gratuita e pública
- Debounce de 500ms no campo CEP para evitar requests desnecessários
- Cache das cidades por UF em memória para evitar re-fetches

