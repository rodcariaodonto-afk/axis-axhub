

## Embed do Íris AXholding via iframe no AXIS

### Visão Geral
Adicionar um módulo "Íris" no AXIS que carrega o projeto Íris AXholding via iframe, sem interferir no WhatsApp existente nem migrar dados. Acesso controlado pelo sistema de permissões do AXIS.

### O que será feito

**1. Nova página `src/pages/Iris.tsx`**
- Componente simples com `<iframe>` apontando para a URL publicada do Íris
- iframe ocupa 100% da área de conteúdo (fullscreen dentro do layout)
- Loading state enquanto o iframe carrega

**2. Rota no `src/App.tsx`**
- Adicionar rota `/iris` protegida por autenticação

**3. Item no menu lateral `src/components/AppSidebar.tsx`**
- Novo item "Íris" na seção de Comunicação (junto com WhatsApp, Chat Interno, Agenda)
- Ícone adequado (ex: `Bot` ou `Sparkles` do lucide)

**4. Controle de permissão**
- Utilizar o sistema RBAC existente (`useUserPermissions`)
- Criar um novo módulo de permissão `iris` no sistema
- Apenas usuários com permissão `iris.view` veem o item no menu e acessam a página
- Por padrão, admin tem acesso; outros usuários precisam receber a permissão

### Detalhes técnicos
- A URL do iframe será a URL publicada do Íris (ex: `https://iris-axholding.lovable.app`)
- Bancos de dados permanecem totalmente separados — zero interferência com WhatsApp ou qualquer outro módulo
- O iframe é sandboxed mas permite `allow-same-origin allow-scripts allow-forms allow-popups` para que o Íris funcione normalmente
- Pode ser necessário adicionar uma migration para registrar o módulo `iris` na tabela de permissões disponíveis

### Arquivos criados/modificados
- `src/pages/Iris.tsx` (novo)
- `src/App.tsx` (nova rota)
- `src/components/AppSidebar.tsx` (novo item no menu)
- Migration SQL: inserir módulo `iris` nas permissões disponíveis (se aplicável)

