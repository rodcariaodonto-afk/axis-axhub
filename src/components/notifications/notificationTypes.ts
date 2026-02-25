export interface NotificationType {
  id: string;
  name: string;
  description: string;
  category: 'sales' | 'system' | 'reminder' | 'financial' | 'operations';
  defaultPriority: 'low' | 'normal' | 'high' | 'urgent';
  icon: string;
}

export const NOTIFICATION_TYPES: NotificationType[] = [
  // Sales
  { id: 'lead_assigned', name: 'Lead Atribuído', description: 'Quando um lead é atribuído a você', category: 'sales', defaultPriority: 'high', icon: 'UserPlus' },
  { id: 'lead_converted', name: 'Lead Convertido', description: 'Quando um lead é convertido em deal', category: 'sales', defaultPriority: 'normal', icon: 'TrendingUp' },
  { id: 'deal_won', name: 'Deal Ganho', description: 'Quando um deal é marcado como ganho', category: 'sales', defaultPriority: 'high', icon: 'Trophy' },
  { id: 'deal_lost', name: 'Deal Perdido', description: 'Quando um deal é marcado como perdido', category: 'sales', defaultPriority: 'normal', icon: 'XCircle' },
  { id: 'deal_stage_changed', name: 'Deal Mudou de Etapa', description: 'Quando um deal avança no pipeline', category: 'sales', defaultPriority: 'low', icon: 'ArrowRight' },
  { id: 'proposal_sent', name: 'Proposta Enviada', description: 'Quando uma proposta é enviada', category: 'sales', defaultPriority: 'normal', icon: 'FileText' },
  // Financial
  { id: 'receivable_overdue', name: 'Conta Vencida', description: 'Quando uma conta a receber vence', category: 'financial', defaultPriority: 'urgent', icon: 'AlertTriangle' },
  { id: 'payment_received', name: 'Pagamento Recebido', description: 'Quando um pagamento é registrado', category: 'financial', defaultPriority: 'normal', icon: 'DollarSign' },
  { id: 'payable_due_soon', name: 'Conta a Pagar Próxima', description: 'Conta a pagar vence em breve', category: 'financial', defaultPriority: 'high', icon: 'Clock' },
  // Operations
  { id: 'stock_low', name: 'Estoque Baixo', description: 'Produto com estoque abaixo do mínimo', category: 'operations', defaultPriority: 'high', icon: 'Package' },
  { id: 'order_created', name: 'Novo Pedido', description: 'Quando um novo pedido é criado', category: 'operations', defaultPriority: 'normal', icon: 'ShoppingCart' },
  { id: 'order_status_changed', name: 'Status do Pedido', description: 'Quando o status de um pedido muda', category: 'operations', defaultPriority: 'low', icon: 'RefreshCw' },
  // Reminders
  { id: 'activity_due', name: 'Atividade Pendente', description: 'Quando uma atividade está próxima do vencimento', category: 'reminder', defaultPriority: 'high', icon: 'CalendarCheck' },
  { id: 'activity_overdue', name: 'Atividade Atrasada', description: 'Quando uma atividade está atrasada', category: 'reminder', defaultPriority: 'urgent', icon: 'AlertCircle' },
  // System
  { id: 'user_invited', name: 'Convite de Usuário', description: 'Quando um novo usuário é convidado', category: 'system', defaultPriority: 'normal', icon: 'UserPlus' },
  { id: 'integration_error', name: 'Erro de Integração', description: 'Quando uma integração falha', category: 'system', defaultPriority: 'urgent', icon: 'AlertTriangle' },
  { id: 'system_update', name: 'Atualização do Sistema', description: 'Novidades e atualizações da plataforma', category: 'system', defaultPriority: 'low', icon: 'Info' },
  // Novos tipos
  { id: 'lead_qualified', name: 'Lead Qualificado', description: 'Quando um lead atinge pontuação de qualificação', category: 'sales', defaultPriority: 'high', icon: 'Star' },
  { id: 'proposal_accepted', name: 'Proposta Aceita', description: 'Quando uma proposta é aceita pelo cliente', category: 'sales', defaultPriority: 'high', icon: 'CheckCircle' },
  { id: 'proposal_rejected', name: 'Proposta Rejeitada', description: 'Quando uma proposta é rejeitada pelo cliente', category: 'sales', defaultPriority: 'normal', icon: 'XCircle' },
  { id: 'deal_stage_approaching', name: 'Deal Próximo do Fechamento', description: 'Quando um deal está próximo da data de fechamento', category: 'sales', defaultPriority: 'high', icon: 'Calendar' },
  { id: 'order_shipped', name: 'Pedido Enviado', description: 'Quando um pedido é despachado', category: 'operations', defaultPriority: 'normal', icon: 'Truck' },
  { id: 'order_delivered', name: 'Pedido Entregue', description: 'Quando um pedido é entregue ao cliente', category: 'operations', defaultPriority: 'low', icon: 'CheckSquare' },
  { id: 'stock_out', name: 'Produto Sem Estoque', description: 'Quando um produto fica com estoque zero', category: 'operations', defaultPriority: 'urgent', icon: 'PackageX' },
  { id: 'return_received', name: 'Devolução Recebida', description: 'Quando uma devolução de produto é registrada', category: 'operations', defaultPriority: 'normal', icon: 'RotateCcw' },
  { id: 'payment_overdue_critical', name: 'Pagamento Crítico Vencido', description: 'Pagamento vencido há mais de 30 dias', category: 'financial', defaultPriority: 'urgent', icon: 'AlertOctagon' },
  { id: 'backup_completed', name: 'Backup Concluído', description: 'Quando o backup do sistema é concluído', category: 'system', defaultPriority: 'low', icon: 'HardDrive' },
  { id: 'maintenance_scheduled', name: 'Manutenção Programada', description: 'Quando uma manutenção do sistema é agendada', category: 'system', defaultPriority: 'normal', icon: 'Wrench' },
  { id: 'internal_chat_message', name: 'Mensagem no Chat Interno', description: 'Quando alguém envia uma mensagem no chat interno', category: 'system', defaultPriority: 'normal', icon: 'MessageSquare' },
];

export const NOTIFICATION_CATEGORY_LABELS: Record<string, string> = {
  sales: 'Vendas',
  financial: 'Financeiro',
  operations: 'Operações',
  reminder: 'Lembretes',
  system: 'Sistema',
};

export const PRIORITY_LABELS: Record<string, string> = {
  low: 'Baixa',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente',
};

export const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-muted-foreground',
  normal: 'text-foreground',
  high: 'text-orange-500',
  urgent: 'text-destructive',
};
