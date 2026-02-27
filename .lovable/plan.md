
# Plano: Workflow Builder com Canvas Visual (estilo n8n)

## Problema
O Workflow Builder atual usa uma lista sequencial de cards (top-down), sem canvas visual. O usuario precisa de um editor com nodes arrastáveis e conexões visuais, igual ao editor de Funis que ja existe no sistema.

## Solucao
Reescrever o WorkflowBuilder usando ReactFlow (ja instalado), seguindo o mesmo padrao do FunnelCanvas existente. Manter toda a logica de catalogo, config fields e persistencia.

---

## Arquitetura

```text
WorkflowBuilder (novo, com ReactFlow)
  ├── WorkflowSidebarPalette (catalogo drag-and-drop)
  ├── ReactFlow Canvas (nodes + edges)
  ├── WorkflowCanvasNode (node customizado)
  ├── WorkflowSettingsPanel (painel lateral de config)
  └── Toolbar (salvar, publicar, voltar)
```

## Arquivos

| Arquivo | Acao |
|---------|------|
| `src/components/workflows/WorkflowCanvasNode.tsx` | Criar - node customizado ReactFlow com cores por tipo (trigger/action/condition), handles de entrada/saida |
| `src/components/workflows/WorkflowSidebarPalette.tsx` | Criar - paleta lateral com itens arrastáveis do catalogo (triggers, actions, conditions) |
| `src/components/workflows/WorkflowSettingsPanel.tsx` | Criar - painel lateral direito para configurar o node selecionado (config fields do catalogo) |
| `src/components/workflows/WorkflowBuilder.tsx` | Reescrever - substituir lista de cards por canvas ReactFlow com drag-drop, conexoes, toolbar |
| `src/components/workflows/WorkflowNodeCard.tsx` | Manter - sem alteracoes (usado na lista de execucoes) |

## Detalhes de Implementacao

### 1. WorkflowCanvasNode
- Node customizado para ReactFlow
- Exibe: icone, label, tipo (Gatilho/Acao/Condicao), badge de cor
- Cores: amber para triggers, primary para actions, emerald para conditions
- Handle superior (target) e inferior (source)
- Conditions terao 2 handles de saida (true/false)

### 2. WorkflowSidebarPalette
- Tabs: Gatilhos, Acoes, Condicoes
- Cada item e arrastavel (onDragStart com dataTransfer)
- Segue o mesmo padrao do FunnelSidebarPalette

### 3. WorkflowSettingsPanel
- Abre ao clicar num node no canvas
- Renderiza os configFields do catalogo (text, select, number, textarea)
- Botao de remover node
- Fecha ao clicar no canvas vazio

### 4. WorkflowBuilder (reescrito)
- Layout: sidebar esquerda + canvas central + settings panel direito
- Full height (`h-[calc(100vh-4rem)]`)
- Toolbar superior: botao voltar, nome do workflow, salvar rascunho, publicar
- onDrop: cria node na posicao do drop
- onConnect: cria edge animada
- Salvar: converte nodes/edges do ReactFlow para o formato `definition` JSONB existente (mantendo compatibilidade)
- Carregar: converte `definition.nodes` e `definition.edges` para nodes/edges ReactFlow

### 5. Compatibilidade de Dados
- O formato salvo no banco permanece o mesmo JSONB `{ nodes, edges }`
- Adiciona `position: { x, y }` a cada node na definition
- Workflows existentes sem posicao recebem posicoes automaticas (layout vertical sequencial)
- `trigger_types` continua sendo extraido dos nodes trigger ao salvar

### 6. Funcionalidades do Canvas
- Drag-and-drop de novos nodes da paleta
- Conexao visual entre nodes (click + drag entre handles)
- Selecao de node abre painel de configuracao
- Delete com tecla Backspace/Delete
- MiniMap, Controls, Background com dots
- Zoom e pan
