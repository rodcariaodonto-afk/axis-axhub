import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const tenantId = "e1a516ab-315c-4c30-b7de-1290a10f965e";
    const userId = user.id;
    const now = new Date().toISOString();

    const articles = [
      {
        title: "Guia Completo de Opportunities (Oportunidades)",
        slug: "crm-opportunities-guia-completo",
        description: "Aprenda a gerenciar suas negociações de venda, desde a prospecção até o fechamento, usando o módulo de Oportunidades.",
        niche: "CRM",
        category: "Guia do Usuário",
        subcategory: "Vendas",
        content: "# Guia Completo de Opportunities (Oportunidades)\n\n## O que são Oportunidades?\n\nOportunidades representam negociações de venda em andamento no seu pipeline comercial. Elas permitem acompanhar o progresso de cada negócio, desde o primeiro contato até o fechamento.\n\n## Como criar uma Oportunidade\n\n1. Acesse **CRM > Oportunidades**\n2. Clique em **Nova Oportunidade**\n3. Preencha os dados: nome, valor estimado, etapa do pipeline, conta vinculada\n4. Salve para começar o acompanhamento\n\n## Pipeline e Etapas\n\nAs oportunidades se movem por etapas configuráveis do pipeline:\n- **Qualificação** - Identificando a necessidade\n- **Proposta** - Apresentando solução\n- **Negociação** - Ajustando termos\n- **Fechamento** - Conclusão do negócio\n\n## Visualização Kanban\n\nUse a visualização Kanban para arrastar oportunidades entre etapas de forma visual e intuitiva.\n\n## Forecasting\n\nO módulo de previsão utiliza os dados das oportunidades para projetar receita futura com base nas probabilidades de fechamento de cada etapa.",
        meta_title: "Guia de Opportunities (Oportunidades) | AXIS CRM",
        meta_description: "Domine a gestão de oportunidades de venda na plataforma AXIS. Pipeline visual, forecasting e acompanhamento completo.",
        keywords: ["crm", "opportunities", "oportunidades", "vendas", "pipeline", "kanban", "forecasting"],
        is_published: true,
        is_featured: true,
        order_index: 1,
      },
      {
        title: "Guia Completo de Contracts (Contratos)",
        slug: "crm-contracts-guia-completo",
        description: "Saiba como gerenciar contratos, desde a criação até a assinatura digital e renovação.",
        niche: "CRM",
        category: "Guia do Usuário",
        subcategory: "Vendas",
        content: "# Guia Completo de Contracts (Contratos)\n\n## O que são Contratos?\n\nContratos formalizam acordos comerciais com seus clientes. O módulo permite criar, gerenciar e acompanhar contratos de ponta a ponta.\n\n## Criando um Contrato\n\n1. Acesse **CRM > Contratos**\n2. Clique em **Novo Contrato**\n3. Preencha: nome, valor, datas de início e fim, conta vinculada\n4. Opcionalmente, use um **template** pré-configurado\n\n## Templates de Contrato\n\nCrie templates reutilizáveis com macros dinâmicas que preenchem automaticamente dados do cliente, valores e datas.\n\n## Assinatura Digital\n\nEnvie contratos para assinatura digital diretamente pela plataforma. O status de assinatura é atualizado em tempo real.\n\n## Versionamento\n\nCada alteração no contrato gera uma nova versão, mantendo o histórico completo de mudanças.\n\n## Renovação\n\nConfigure alertas de renovação para nunca perder prazos importantes.",
        meta_title: "Guia de Contratos | AXIS CRM",
        meta_description: "Gerencie contratos com eficiência. Aprenda a criar, assinar digitalmente e renovar contratos na plataforma AXIS.",
        keywords: ["crm", "contratos", "contracts", "vendas", "assinatura"],
        is_published: true,
        is_featured: false,
        order_index: 2,
      },
      {
        title: "Gestão de Atividades",
        slug: "crm-activities-gestao",
        description: "Organize suas atividades de vendas: ligações, reuniões, e-mails e tarefas em um só lugar.",
        niche: "CRM",
        category: "Guia do Usuário",
        subcategory: "Produtividade",
        content: "# Gestão de Atividades\n\n## O que são Atividades?\n\nAtividades são ações de vendas como ligações, reuniões, e-mails e tarefas que você precisa realizar para avançar seus negócios.\n\n## Tipos de Atividade\n\n- **Tarefa** - Ações gerais a serem concluídas\n- **Ligação** - Chamadas telefônicas agendadas\n- **Reunião** - Encontros presenciais ou virtuais\n- **E-mail** - Comunicações por e-mail\n\n## Criando Atividades\n\n1. Acesse **CRM > Atividades**\n2. Clique em **Nova Atividade**\n3. Selecione o tipo, defina título, descrição e data\n4. Vincule a um lead, deal ou conta\n\n## Acompanhamento\n\nMarque atividades como concluídas e acompanhe seu histórico de produtividade.",
        meta_title: "Gestão de Atividades | AXIS CRM",
        meta_description: "Organize e rastreie todas as suas atividades de vendas na plataforma AXIS. Ligações, reuniões e tarefas centralizadas.",
        keywords: ["crm", "atividades", "activities", "ligações", "reuniões", "e-mail"],
        is_published: true,
        is_featured: false,
        order_index: 3,
      },
      {
        title: "Gestão de Produtos",
        slug: "erp-products-gestao",
        description: "Aprenda a cadastrar, organizar e gerenciar produtos no sistema ERP.",
        niche: "ERP",
        category: "Guia do Usuário",
        subcategory: "Inventário",
        content: "# Gestão de Produtos\n\n## Cadastrando Produtos\n\n1. Acesse **ERP > Produtos**\n2. Clique em **Novo Produto**\n3. Preencha: nome, SKU, preço, categoria\n4. Configure variações (tamanho, cor, etc.)\n\n## Categorias\n\nOrganize seus produtos em categorias e subcategorias para facilitar a busca e gestão.\n\n## Variações\n\nCrie variações de produto (tamanho, cor, modelo) com preços e estoque individuais.\n\n## Canais de Venda\n\nDefina em quais canais cada produto está disponível para venda.",
        meta_title: "Gestão de Produtos | AXIS ERP",
        meta_description: "Cadastre e gerencie seus produtos com eficiência no AXIS ERP. Categorias, variações e canais de venda.",
        keywords: ["erp", "produtos", "products", "estoque", "inventory"],
        is_published: true,
        is_featured: false,
        order_index: 4,
      },
      {
        title: "Controle de Estoque",
        slug: "erp-inventory-controle",
        description: "Gerencie seu estoque com precisão: movimentações, ajustes e alertas de reposição.",
        niche: "ERP",
        category: "Guia do Usuário",
        subcategory: "Inventário",
        content: "# Controle de Estoque\n\n## Visão Geral do Estoque\n\nA tela de gerenciamento de estoque permite que você controle movimentações, ajustes e alertas de reposição em tempo real.\n\n## Movimentações\n\nRegistre entradas e saídas de produtos com rastreabilidade completa.\n\n## Ajustes de Inventário\n\nRealize ajustes manuais quando necessário, com justificativa registrada.\n\n## Alertas de Reposição\n\nConfigure alertas automáticos quando o estoque atingir o nível mínimo definido.\n\n## Depósitos\n\nGerencie múltiplos depósitos e controle o estoque de cada um separadamente.",
        meta_title: "Controle de Estoque | AXIS ERP",
        meta_description: "Mantenha seu estoque sob controle com ferramentas de rastreamento, alertas e gestão de múltiplos depósitos.",
        keywords: ["erp", "estoque", "inventory", "movimentação", "alertas"],
        is_published: true,
        is_featured: false,
        order_index: 5,
      },
      {
        title: "Gestão de Pedidos de Venda",
        slug: "erp-sales-orders-gestao",
        description: "Crie e gerencie pedidos de venda, desde a cotação até a entrega.",
        niche: "ERP",
        category: "Guia do Usuário",
        subcategory: "Vendas",
        content: "# Gestão de Pedidos de Venda\n\n## Criando um Pedido de Venda\n\nCrie e gerencie pedidos de venda, desde a cotação até a entrega.\n\n1. Acesse **ERP > Pedidos**\n2. Clique em **Novo Pedido**\n3. Selecione o cliente e adicione produtos\n4. Defina condições de pagamento e entrega\n\n## Status do Pedido\n\nAcompanhe o progresso: Rascunho → Confirmado → Em Separação → Enviado → Entregue\n\n## Faturamento\n\nGere notas fiscais e registre pagamentos diretamente no pedido.\n\n## Integração com Estoque\n\nO estoque é atualizado automaticamente ao confirmar o pedido.",
        meta_title: "Gestão de Pedidos de Venda | AXIS ERP",
        meta_description: "Gerencie seus pedidos de venda com eficiência e rastreie cada etapa do processo.",
        keywords: ["erp", "pedidos", "sales orders", "vendas", "faturamento"],
        is_published: true,
        is_featured: false,
        order_index: 6,
      },
      {
        title: "Contas a Receber",
        slug: "financial-accounts-receivable",
        description: "Gerencie cobranças de clientes, acompanhe pagamentos e controle seu fluxo de caixa.",
        niche: "Financeiro",
        category: "Guia do Usuário",
        subcategory: "Financeiro",
        content: "# Contas a Receber\n\n## O que é Contas a Receber?\n\nContas a Receber são valores que seus clientes devem pagar pelos produtos ou serviços fornecidos.\n\n## Gerenciando Recebíveis\n\n1. Acesse **Financeiro > Contas a Receber**\n2. Visualize todos os títulos pendentes\n3. Registre pagamentos recebidos\n4. Acompanhe vencimentos e atrasos\n\n## Fluxo de Caixa\n\nUtilize os dados de contas a receber para projetar seu fluxo de caixa futuro.\n\n## Conciliação Bancária\n\nConcilie pagamentos recebidos com extratos bancários para manter seus registros atualizados.",
        meta_title: "Contas a Receber | AXIS Financeiro",
        meta_description: "Gerencie suas cobranças e acompanhe o fluxo de caixa com o módulo de Contas a Receber.",
        keywords: ["financeiro", "contas a receber", "accounts receivable", "cobrança", "fluxo de caixa"],
        is_published: true,
        is_featured: false,
        order_index: 7,
      },
      {
        title: "Contas a Pagar",
        slug: "financial-accounts-payable",
        description: "Controle suas despesas, prazos de pagamento e fluxo de caixa com eficiência.",
        niche: "Financeiro",
        category: "Guia do Usuário",
        subcategory: "Financeiro",
        content: "# Contas a Pagar\n\n## O que é Contas a Pagar?\n\nContas a Pagar são obrigações financeiras da empresa com fornecedores e prestadores de serviço.\n\n## Gerenciando Pagamentos\n\n1. Acesse **Financeiro > Contas a Pagar**\n2. Cadastre novas contas a pagar\n3. Acompanhe vencimentos\n4. Registre pagamentos realizados\n\n## Categorização\n\nCategorize despesas para análise financeira detalhada.\n\n## Planejamento\n\nUtilize os dados para planejar seu fluxo de caixa e evitar surpresas.",
        meta_title: "Contas a Pagar | AXIS Financeiro",
        meta_description: "Controle suas despesas e planeje seu fluxo de caixa com o módulo de Contas a Pagar.",
        keywords: ["financeiro", "contas a pagar", "accounts payable", "despesas", "pagamentos"],
        is_published: true,
        is_featured: false,
        order_index: 8,
      },
      {
        title: "Integração com WhatsApp",
        slug: "communication-whatsapp-integration",
        description: "Configure a integração com WhatsApp para enviar mensagens, gerenciar contatos e automatizar comunicações.",
        niche: "Comunicação",
        category: "Guia do Usuário",
        subcategory: "Integrações",
        content: "# Integração com WhatsApp\n\n## Configurando a Integração\n\n1. Acesse **Configurações > Integrações > WhatsApp**\n2. Conecte sua conta via QR Code\n3. Configure sessões e preferências\n\n## Enviando Mensagens\n\nEnvie mensagens de texto, imagens, documentos e áudios diretamente pela plataforma.\n\n## Gerenciando Contatos\n\nSincronize contatos do WhatsApp com seu CRM automaticamente.\n\n## Templates\n\nCrie e gerencie templates de mensagens para comunicações frequentes.\n\n## Automação\n\nIntegre com Workflows para automatizar respostas e notificações via WhatsApp.",
        meta_title: "Integração com WhatsApp | AXIS",
        meta_description: "Integre WhatsApp à sua plataforma e comunique-se com clientes de forma eficiente.",
        keywords: ["whatsapp", "integração", "communication", "mensagens", "automação"],
        is_published: true,
        is_featured: false,
        order_index: 9,
      },
      {
        title: "Workflows de Automação",
        slug: "automation-workflows",
        description: "Crie fluxos de trabalho automáticos para economizar tempo e aumentar a produtividade.",
        niche: "Automação",
        category: "Guia do Usuário",
        subcategory: "Automação",
        content: "# Workflows de Automação\n\n## O que é um Workflow?\n\nUm workflow é um conjunto de tarefas que são executadas em sequência para automatizar um processo de negócio.\n\n## Criando um Workflow\n\n1. Acesse **Automação > Workflows**\n2. Clique em **Novo Workflow**\n3. Arraste gatilhos, ações e condições no canvas visual\n4. Conecte os nós para definir o fluxo\n\n## Gatilhos\n\nDefina eventos que iniciam o workflow: lead criado, formulário respondido, mensagem recebida, etc.\n\n## Ações\n\nConfigure ações automáticas: enviar notificação, criar atividade, enviar mensagem WhatsApp, atualizar campos, etc.\n\n## Condições\n\nAdicione condições para criar ramificações no fluxo baseadas em critérios específicos.\n\n## Templates\n\nUtilize templates pré-configurados para cenários comuns de vendas, marketing e operações.",
        meta_title: "Workflows de Automação | AXIS",
        meta_description: "Automatize seus processos com workflows inteligentes e aumente a produtividade da sua equipe.",
        keywords: ["automação", "workflows", "automation", "processos", "eficiência"],
        is_published: true,
        is_featured: false,
        order_index: 10,
      },
      {
        title: "Gestão de Leads",
        slug: "crm-leads-gestao",
        description: "Capture, qualifique e converta leads em clientes com eficiência usando o módulo de Leads.",
        niche: "CRM",
        category: "Guia do Usuário",
        subcategory: "Vendas",
        content: "# Gestão de Leads\n\n## O que é um Lead?\n\nUm lead é um contato que demonstrou interesse em seus produtos ou serviços e pode se tornar um cliente.\n\n## Capturando Leads\n\n1. Acesse **CRM > Leads**\n2. Adicione leads manualmente ou via formulários integrados\n3. Configure fontes de captura automática\n\n## Qualificação\n\nUtilize scoring para priorizar os leads mais promissores com base em critérios configuráveis.\n\n## Conversão\n\nConverta leads qualificados em oportunidades, contas e contatos com um clique.\n\n## Tags e Segmentação\n\nOrganize leads com tags e filtros para campanhas segmentadas.",
        meta_title: "Gestão de Leads | AXIS CRM",
        meta_description: "Capture e qualifique leads com eficiência para aumentar suas conversões no AXIS CRM.",
        keywords: ["crm", "leads", "gestão de leads", "vendas", "funil"],
        is_published: true,
        is_featured: false,
        order_index: 11,
      },
      {
        title: "Gestão de Contas (Accounts)",
        slug: "crm-accounts-gestao",
        description: "Gerencie suas contas de clientes, parceiros e fornecedores com eficiência.",
        niche: "CRM",
        category: "Guia do Usuário",
        subcategory: "Relacionamento",
        content: "# Gestão de Contas (Accounts)\n\n## O que é uma Conta?\n\nUma conta é uma representação de um cliente ou potencial cliente em um sistema de CRM. Ela centraliza informações relevantes sobre o relacionamento com o cliente, permitindo um gerenciamento mais eficaz.\n\n## Criando uma Conta\n\n1. Acesse **CRM > Contas**\n2. Clique em **Nova Conta**\n3. Preencha: nome da empresa, CNPJ, segmento, contatos\n\n## Informações da Conta\n\n- Dados cadastrais (nome, CNPJ, endereço)\n- Contatos vinculados\n- Oportunidades e deals relacionados\n- Contratos ativos\n- Histórico de atividades\n\n## Segmentação\n\nSegmente suas contas por setor, tamanho, localização e outros critérios personalizáveis.",
        meta_title: "Gestão de Contas | AXIS CRM",
        meta_description: "Centralize informações de clientes e gerencie relacionamentos com o módulo de Contas do AXIS CRM.",
        keywords: ["crm", "accounts", "contas", "clientes", "relacionamento"],
        is_published: true,
        is_featured: false,
        order_index: 12,
      },
    ];

    const rows = articles.map((a) => ({
      tenant_id: tenantId,
      title: a.title,
      slug: a.slug,
      description: a.description,
      niche: a.niche,
      category: a.category,
      subcategory: a.subcategory,
      content: a.content,
      meta_title: a.meta_title,
      meta_description: a.meta_description,
      keywords: a.keywords,
      is_published: a.is_published,
      is_featured: a.is_featured,
      order_index: a.order_index,
      version: 1,
      created_by: userId,
      updated_by: userId,
      created_at: now,
      updated_at: now,
    }));

    const { data, error } = await supabase
      .from("documentation")
      .insert(rows)
      .select("id, title, slug");

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ message: `${data.length} artigos importados com sucesso`, articles: data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
