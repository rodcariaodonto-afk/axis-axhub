
# Plano: Melhorias no Cadastro de Contas

## 1. Seletor CNPJ / CPF
Substituir o campo fixo "CNPJ" por um seletor que permite escolher entre **CPF** ou **CNPJ**, com mascara e validacao adequada para cada tipo.

### Mudancas em `src/pages/Accounts.tsx`:
- Adicionar campo `doc_type` ao estado do form (`"cnpj"` ou `"cpf"`)
- Trocar o label fixo "CNPJ" por um `Select` com opcoes "CNPJ" e "CPF"
- Ajustar placeholder e validacao conforme o tipo selecionado:
  - CPF: `000.000.000-00` (regex `^\d{3}\.\d{3}\.\d{3}-\d{2}$`)
  - CNPJ: `00.000.000/0000-00` (regex existente)
- A coluna `cnpj` do banco continua sendo usada para ambos (sem necessidade de migracao, apenas muda o label)

### Mudancas em `src/pages/AccountDetail.tsx`:
- Mesma logica de seletor CNPJ/CPF no modal de edicao
- Na exibicao do detalhe, mostrar o label correto baseado no formato do documento armazenado

### Na listagem (tabela):
- Renomear coluna "CNPJ" para "Documento" para acomodar ambos os tipos

## 2. Campo Instagram
Adicionar um campo "Instagram" ao formulario de criacao/edicao de contas.

### Migracao de banco:
- Adicionar coluna `instagram` (TEXT, nullable) na tabela `crm_accounts`

### Mudancas em `src/pages/Accounts.tsx`:
- Adicionar campo `instagram` ao estado do form
- Adicionar input com placeholder `@perfil` abaixo do campo Website
- Salvar no payload

### Mudancas em `src/pages/AccountDetail.tsx`:
- Exibir card de Instagram na area de informacoes (com icone)
- Adicionar campo Instagram no modal de edicao

## 3. Sobre o campo Proprietario
O campo "Proprietario" indica **quem da equipe e responsavel por essa conta** (o vendedor/gerente de conta). Nao e quem criou, mas quem cuida do relacionamento com o cliente. Esse e um padrao de CRM para distribuicao de carteira. O campo continuara funcionando da mesma forma.

## Resumo dos arquivos

| Arquivo | Acao |
|---------|------|
| Migracao SQL | Criar — adicionar coluna `instagram` em `crm_accounts` |
| `src/pages/Accounts.tsx` | Editar — seletor CPF/CNPJ + campo Instagram |
| `src/pages/AccountDetail.tsx` | Editar — seletor CPF/CNPJ + campo Instagram + exibicao |

## Detalhes Tecnicos

### Seletor de documento no formulario:
```text
[CPF v] [___.___.___-__]     [Segmento v]
  ou
[CNPJ v] [__.___.___/____-__]  [Segmento v]
```

### Deteccao automatica ao editar:
- Se o valor armazenado em `cnpj` tiver 14 digitos (formato CNPJ), seleciona CNPJ
- Se tiver 11 digitos (formato CPF), seleciona CPF
- Caso contrario, padrao CNPJ

### Campo Instagram:
- Input texto com placeholder `@perfil`
- Armazenado como texto simples na coluna `instagram`
- Exibido como link clicavel para `https://instagram.com/{perfil}` na pagina de detalhe
