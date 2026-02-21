export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: "vendas" | "operacoes" | "financeiro" | "marketing";
  icon: string;
  definition: {
    nodes: { id: string; type: string; catalogId: string; config: Record<string, string> }[];
  };
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  // ── Vendas ──
  {
    id: "lead-nurturing",
    name: "Lead Nurturing",
    description: "Notifica e cria follow-up quando lead com score alto é criado",
    category: "vendas",
    icon: "🌱",
    definition: {
      nodes: [
        { id: "n1", type: "trigger", catalogId: "lead.created", config: {} },
        { id: "n2", type: "condition", catalogId: "field_greater_than", config: { field: "score", value: "50" } },
        { id: "n3", type: "action", catalogId: "create_notification", config: { title: "Lead qualificado!", message: "Um novo lead com score alto foi criado", priority: "high" } },
        { id: "n4", type: "action", catalogId: "create_activity", config: { title: "Follow-up com lead", type: "call", description: "Ligar para o lead qualificado" } },
      ],
    },
  },
  {
    id: "followup-automatico",
    name: "Follow-up Automático",
    description: "Cria atividade de ligação quando deal muda de etapa",
    category: "vendas",
    icon: "📞",
    definition: {
      nodes: [
        { id: "n1", type: "trigger", catalogId: "deal.stage_changed", config: {} },
        { id: "n2", type: "action", catalogId: "create_activity", config: { title: "Follow-up do deal", type: "call", description: "Ligar para acompanhar avanço do deal" } },
      ],
    },
  },
  {
    id: "fechamento-deal",
    name: "Fechamento de Deal",
    description: "Notifica e cria tarefa de onboarding ao ganhar deal",
    category: "vendas",
    icon: "🏆",
    definition: {
      nodes: [
        { id: "n1", type: "trigger", catalogId: "deal.won", config: {} },
        { id: "n2", type: "action", catalogId: "create_notification", config: { title: "Deal ganho!", message: "Parabéns! Um deal foi fechado com sucesso", priority: "high" } },
        { id: "n3", type: "action", catalogId: "create_task", config: { title: "Onboarding do novo cliente", description: "Iniciar processo de onboarding" } },
      ],
    },
  },
  {
    id: "perda-oportunidade",
    name: "Perda de Oportunidade",
    description: "Notifica e adiciona tag quando deal é perdido",
    category: "vendas",
    icon: "📉",
    definition: {
      nodes: [
        { id: "n1", type: "trigger", catalogId: "deal.lost", config: {} },
        { id: "n2", type: "action", catalogId: "create_notification", config: { title: "Deal perdido", message: "Um deal foi marcado como perdido", priority: "normal" } },
        { id: "n3", type: "action", catalogId: "add_tag", config: { tag: "perdido" } },
      ],
    },
  },
  {
    id: "qualificacao-lead",
    name: "Qualificação de Lead",
    description: "Atualiza status do lead quando score atinge 80+",
    category: "vendas",
    icon: "⭐",
    definition: {
      nodes: [
        { id: "n1", type: "trigger", catalogId: "lead.updated", config: {} },
        { id: "n2", type: "condition", catalogId: "field_greater_than", config: { field: "score", value: "80" } },
        { id: "n3", type: "action", catalogId: "update_lead_field", config: { field: "status", value: "qualified" } },
      ],
    },
  },
  // ── Operações ──
  {
    id: "novo-pedido",
    name: "Novo Pedido",
    description: "Notifica e cria tarefa ao receber novo pedido",
    category: "operacoes",
    icon: "📦",
    definition: {
      nodes: [
        { id: "n1", type: "trigger", catalogId: "order.created", config: {} },
        { id: "n2", type: "action", catalogId: "create_notification", config: { title: "Novo pedido recebido", message: "Um novo pedido foi criado e precisa ser processado", priority: "high" } },
        { id: "n3", type: "action", catalogId: "create_task", config: { title: "Processar pedido", description: "Verificar e processar o novo pedido" } },
      ],
    },
  },
  {
    id: "pedido-pago",
    name: "Pedido Pago",
    description: "Notifica equipe quando pedido é pago",
    category: "operacoes",
    icon: "💰",
    definition: {
      nodes: [
        { id: "n1", type: "trigger", catalogId: "order.paid", config: {} },
        { id: "n2", type: "action", catalogId: "create_notification", config: { title: "Pagamento confirmado", message: "O pagamento de um pedido foi confirmado", priority: "normal" } },
      ],
    },
  },
  {
    id: "novo-cliente",
    name: "Novo Cliente",
    description: "Boas-vindas e criação de atividade para novo cliente",
    category: "operacoes",
    icon: "🤝",
    definition: {
      nodes: [
        { id: "n1", type: "trigger", catalogId: "customer.created", config: {} },
        { id: "n2", type: "action", catalogId: "create_notification", config: { title: "Novo cliente cadastrado", message: "Um novo cliente foi adicionado ao sistema", priority: "normal" } },
        { id: "n3", type: "action", catalogId: "create_activity", config: { title: "Boas-vindas ao cliente", type: "email", description: "Enviar e-mail de boas-vindas" } },
      ],
    },
  },
  {
    id: "alerta-integracao",
    name: "Alerta de Integração",
    description: "Envia webhook manualmente para sistemas externos",
    category: "operacoes",
    icon: "🔔",
    definition: {
      nodes: [
        { id: "n1", type: "trigger", catalogId: "manual", config: {} },
        { id: "n2", type: "action", catalogId: "send_webhook", config: { url: "https://seu-sistema.com/webhook", method: "POST" } },
      ],
    },
  },
  // ── Financeiro ──
  {
    id: "cobranca-automatica",
    name: "Cobrança Automática",
    description: "Cria notificação de cobrança manual",
    category: "financeiro",
    icon: "💸",
    definition: {
      nodes: [
        { id: "n1", type: "trigger", catalogId: "manual", config: {} },
        { id: "n2", type: "action", catalogId: "create_notification", config: { title: "Lembrete de cobrança", message: "Existem cobranças pendentes que precisam de atenção", priority: "high" } },
      ],
    },
  },
  {
    id: "alerta-financeiro",
    name: "Alerta Financeiro",
    description: "Notifica financeiro quando pedido é pago",
    category: "financeiro",
    icon: "📊",
    definition: {
      nodes: [
        { id: "n1", type: "trigger", catalogId: "order.paid", config: {} },
        { id: "n2", type: "action", catalogId: "create_notification", config: { title: "Receita registrada", message: "Um novo pagamento foi recebido e precisa ser conciliado", priority: "normal" } },
      ],
    },
  },
  {
    id: "reconciliacao",
    name: "Reconciliação",
    description: "Cria tarefa de reconciliação quando pedido pago atende critérios",
    category: "financeiro",
    icon: "🔄",
    definition: {
      nodes: [
        { id: "n1", type: "trigger", catalogId: "order.paid", config: {} },
        { id: "n2", type: "condition", catalogId: "field_equals", config: { field: "paid_status", value: "paid" } },
        { id: "n3", type: "action", catalogId: "create_task", config: { title: "Reconciliar pagamento", description: "Verificar e reconciliar o pagamento recebido" } },
      ],
    },
  },
  // ── Marketing ──
  {
    id: "segmentacao-lead",
    name: "Segmentação de Lead",
    description: "Adiciona tag baseada no conteúdo de um campo",
    category: "marketing",
    icon: "🎯",
    definition: {
      nodes: [
        { id: "n1", type: "trigger", catalogId: "lead.created", config: {} },
        { id: "n2", type: "condition", catalogId: "field_contains", config: { field: "source", value: "google" } },
        { id: "n3", type: "action", catalogId: "add_tag", config: { tag: "google-ads" } },
      ],
    },
  },
  {
    id: "reengajamento",
    name: "Reengajamento",
    description: "Cria atividade e notificação para reengajar leads",
    category: "marketing",
    icon: "🔁",
    definition: {
      nodes: [
        { id: "n1", type: "trigger", catalogId: "manual", config: {} },
        { id: "n2", type: "action", catalogId: "create_activity", config: { title: "Reengajamento de lead", type: "email", description: "Enviar e-mail de reengajamento" } },
        { id: "n3", type: "action", catalogId: "create_notification", config: { title: "Campanha de reengajamento", message: "Atividade de reengajamento criada", priority: "low" } },
      ],
    },
  },
  {
    id: "campanha-followup",
    name: "Campanha Follow-up",
    description: "Cria atividade quando campo do lead é preenchido",
    category: "marketing",
    icon: "📬",
    definition: {
      nodes: [
        { id: "n1", type: "trigger", catalogId: "lead.updated", config: {} },
        { id: "n2", type: "condition", catalogId: "field_empty", config: { field: "email", operator: "not_empty" } },
        { id: "n3", type: "action", catalogId: "create_activity", config: { title: "Follow-up de campanha", type: "email", description: "Enviar follow-up para lead com e-mail preenchido" } },
      ],
    },
  },
];

export const TEMPLATE_CATEGORY_LABELS: Record<string, string> = {
  all: "Todos",
  vendas: "Vendas",
  operacoes: "Operações",
  financeiro: "Financeiro",
  marketing: "Marketing",
};
