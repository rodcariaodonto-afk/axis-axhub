

# Funis de Venda - Canvas Visual (tipo N8N)

## Resumo
Criar uma nova funcionalidade completa de **Funis de Venda** com um canvas visual drag-and-drop usando React Flow, permitindo ao usuario desenhar fluxos de automacao com blocos conectaveis, integrados ao WhatsApp nativo da plataforma.

## O que sera criado

### 1. Nova pagina "Funis de Venda" no sidebar
- Novo item no menu lateral na secao "CRM"
- Rota `/funis` com listagem de funis
- Rota `/funis/:id` para o editor visual

### 2. Canvas Visual com React Flow
- Area de trabalho com drag and drop de blocos
- Paleta lateral com blocos arrastaveis organizados por categoria
- Painel de propriedades ao clicar em um bloco
- Conexao entre blocos com linhas (edges)
- Zoom, pan, minimap, e controles
- Salvamento automatico

### 3. Tipos de Blocos

**Gatilhos (Entrada):**
- Webhook (recebe chamada HTTP)
- Inicio de Campanha
- Tag Adicionada

**Acoes:**
- Enviar Mensagem de Texto (WhatsApp)
- Enviar Midia
- Delay (aguardar tempo)
- Atualizar Contato

**Logica:**
- Condicao If/Else (bifurca o fluxo)
- Aguardar Resposta

**Saida:**
- Fim do Fluxo
- Adicionar Tag

### 4. Banco de Dados - 6 novas tabelas

| Tabela | Funcao |
|--------|--------|
| `funis` | Definicao principal de cada funil (nome, status, gatilho) |
| `funis_blocos` | Cada bloco no canvas (tipo, posicao, configuracoes) |
| `funis_conexoes` | Conexoes entre blocos (edges) |
| `funis_execucoes` | Registro de execucao por contato |
| `funis_logs` | Log detalhado de cada passo |
| `funis_variaveis` | Variaveis dinamicas por execucao |

Todas com RLS baseado em `tenant_id` seguindo o padrao existente.

### 5. Backend Functions (Edge Functions)

| Function | Funcao |
|----------|--------|
| `start-funnel-execution` | Inicia execucao de um funil para um contato |
| `process-funnel-queue` | Motor principal - processa bloco atual e decide proximo |

O salvamento dos funis sera feito diretamente pelo frontend via SDK do banco.

### 6. Integracao WhatsApp
- Bloco "Enviar Mensagem" chama a edge function `send-whatsapp-message` ja existente
- Selecao de sessao WhatsApp no painel de propriedades do bloco

## Detalhes tecnicos

### Dependencia nova
- `reactflow` - biblioteca para canvas visual com nodes e edges

### Arquivos a criar

**Paginas:**
- `src/pages/Funis.tsx` - Listagem de funis
- `src/pages/FunilEditor.tsx` - Pagina do editor canvas

**Componentes:**
- `src/components/funnels/FunnelCanvas.tsx` - Canvas principal com React Flow
- `src/components/funnels/FunnelSidebarPalette.tsx` - Paleta de blocos arrastaveis
- `src/components/funnels/FunnelSettingsPanel.tsx` - Painel de configuracoes do bloco selecionado
- `src/components/funnels/FunnelCustomNode.tsx` - Componente visual de cada bloco
- `src/components/funnels/FunnelList.tsx` - Lista de funis com status e acoes
- `src/components/funnels/funnelBlockTypes.ts` - Catalogo de tipos de blocos

**Edge Functions:**
- `supabase/functions/start-funnel-execution/index.ts`
- `supabase/functions/process-funnel-queue/index.ts`

### Arquivos a modificar
- `src/App.tsx` - Adicionar rotas `/funis` e `/funis/:id`
- `src/components/AppSidebar.tsx` - Adicionar item "Funis de Venda" no menu CRM

### Migracao SQL
Uma unica migracao criando as 6 tabelas com:
- Chaves primarias UUID
- `tenant_id` em todas as tabelas (adaptado do `workspace_id` do documento)
- RLS policies baseadas em `get_user_tenant_id()`
- Indices para performance nas queries mais comuns

### Fluxo do usuario

```text
1. Acessa "Funis de Venda" no menu
2. Ve lista de funis existentes (ou vazia)
3. Clica "Novo Funil" -> abre editor canvas
4. Arrasta blocos da paleta para o canvas
5. Conecta blocos com linhas
6. Clica em um bloco para configurar propriedades
7. Salva o funil (rascunho ou publicar)
8. Pode iniciar execucao para contatos
```

## Consideracoes
- A implementacao sera feita em etapas: primeiro banco + frontend (canvas funcional), depois edge functions de execucao
- O documento original usa `workspace_id`, mas sera adaptado para `tenant_id` seguindo o padrao da plataforma
- Os blocos de condicao terao duas saidas (Sim/Nao) com handles separados no React Flow

