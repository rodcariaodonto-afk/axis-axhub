import {
  Zap, UserPlus, RefreshCw, Trophy, XCircle, GitBranch, ShoppingCart, CreditCard, Users,
  Bell, Edit, ArrowRight, CalendarPlus, Tag, Webhook, Clock, ClipboardList,
  Equal, Search, TrendingUp, HelpCircle, Play, MessageSquare, Send,
  Image, FileText, Mic, Smartphone, MessageCircle, Timer, Calendar,
} from "lucide-react";

export interface CatalogItem {
  id: string;
  label: string;
  description: string;
  icon: typeof Zap;
  category: "trigger" | "action" | "condition";
  configFields?: ConfigField[];
}

export interface ConfigField {
  key: string;
  label: string;
  type: "text" | "select" | "number" | "textarea";
  options?: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
}

// ── Triggers ──
export const triggersCatalog: CatalogItem[] = [
  { id: "lead.created", label: "Lead criado", description: "Quando um novo lead é criado", icon: UserPlus, category: "trigger" },
  { id: "lead.updated", label: "Lead atualizado", description: "Quando um lead é atualizado", icon: RefreshCw, category: "trigger" },
  { id: "deal.won", label: "Deal ganho", description: "Quando um deal é marcado como ganho", icon: Trophy, category: "trigger" },
  { id: "deal.lost", label: "Deal perdido", description: "Quando um deal é marcado como perdido", icon: XCircle, category: "trigger" },
  { id: "deal.stage_changed", label: "Deal mudou de etapa", description: "Quando um deal muda de etapa no pipeline", icon: GitBranch, category: "trigger" },
  { id: "order.created", label: "Pedido criado", description: "Quando um novo pedido é criado", icon: ShoppingCart, category: "trigger" },
  { id: "order.paid", label: "Pedido pago", description: "Quando um pedido é marcado como pago", icon: CreditCard, category: "trigger" },
  { id: "customer.created", label: "Cliente criado", description: "Quando um novo cliente é cadastrado", icon: Users, category: "trigger" },
  { id: "manual", label: "Execução manual", description: "Executado manualmente pelo usuário", icon: Play, category: "trigger" },
  { id: "form.submitted", label: "Formulário respondido", description: "Quando uma resposta de formulário é enviada", icon: ClipboardList, category: "trigger" },
  {
    id: "whatsapp.message_received", label: "Mensagem recebida no WhatsApp", description: "Quando uma mensagem é recebida via WhatsApp (Evolution ou Meta Cloud API)", icon: MessageSquare, category: "trigger",
    configFields: [
      { key: "provider", label: "Provedor", type: "select", options: [{ value: "evolution", label: "Evolution API" }, { value: "meta", label: "Meta Cloud API" }], placeholder: "Selecione o provedor" },
      { key: "session_id", label: "Sessão WhatsApp (Evolution)", type: "text", placeholder: "ID da sessão — apenas Evolution" },
      { key: "connection_id", label: "Conexão WhatsApp (Meta)", type: "text", placeholder: "ID da conexão Meta — apenas Meta" },
      { key: "keyword", label: "Palavra-chave (opcional)", type: "text", placeholder: "Ex: oi, ajuda, preço" },
    ],
  },
];

// ── Actions ──
export const actionsCatalog: CatalogItem[] = [
  {
    id: "create_notification", label: "Enviar notificação", description: "Envia notificação in-app", icon: Bell, category: "action",
    configFields: [
      { key: "title", label: "Título", type: "text", required: true, placeholder: "Título da notificação" },
      { key: "message", label: "Mensagem", type: "textarea", required: true, placeholder: "Corpo da notificação" },
      { key: "priority", label: "Prioridade", type: "select", options: [{ value: "low", label: "Baixa" }, { value: "normal", label: "Normal" }, { value: "high", label: "Alta" }] },
    ],
  },
  {
    id: "update_lead_field", label: "Atualizar campo do lead", description: "Atualiza um campo específico do lead", icon: Edit, category: "action",
    configFields: [
      { key: "field", label: "Campo", type: "select", options: [{ value: "status", label: "Status" }, { value: "score", label: "Score" }, { value: "source", label: "Fonte" }], required: true },
      { key: "value", label: "Novo valor", type: "text", required: true, placeholder: "Valor" },
    ],
  },
  {
    id: "move_deal_stage", label: "Mover deal de etapa", description: "Move o deal para outra etapa do pipeline", icon: ArrowRight, category: "action",
    configFields: [
      { key: "stage_name", label: "Nome da etapa destino", type: "text", required: true, placeholder: "Ex: Negociação" },
    ],
  },
  {
    id: "create_activity", label: "Criar atividade", description: "Cria uma nova atividade/tarefa", icon: CalendarPlus, category: "action",
    configFields: [
      { key: "title", label: "Título", type: "text", required: true, placeholder: "Título da atividade" },
      { key: "type", label: "Tipo", type: "select", options: [{ value: "task", label: "Tarefa" }, { value: "call", label: "Ligação" }, { value: "meeting", label: "Reunião" }, { value: "email", label: "E-mail" }] },
      { key: "description", label: "Descrição", type: "textarea", placeholder: "Descrição" },
      { key: "assigned_to_user_id", label: "Atribuir para usuário (opcional)", type: "text", placeholder: "UUID do profile — vazio usa o criador do workflow" },
    ],
  },
  {
    id: "add_tag", label: "Adicionar tag ao lead", description: "Adiciona uma tag ao lead", icon: Tag, category: "action",
    configFields: [
      { key: "tag", label: "Tag", type: "text", required: true, placeholder: "Nome da tag" },
    ],
  },
  {
    id: "send_webhook", label: "Enviar webhook externo", description: "Envia dados para uma URL externa", icon: Webhook, category: "action",
    configFields: [
      { key: "url", label: "URL", type: "text", required: true, placeholder: "https://..." },
      { key: "method", label: "Método", type: "select", options: [{ value: "POST", label: "POST" }, { value: "PUT", label: "PUT" }] },
    ],
  },
  {
    id: "delay", label: "Aguardar", description: "Aguarda um tempo antes de continuar (placeholder)", icon: Clock, category: "action",
    configFields: [
      { key: "minutes", label: "Minutos", type: "number", required: true, placeholder: "5" },
    ],
  },
  {
    id: "create_task", label: "Criar tarefa", description: "Cria uma tarefa para o responsável", icon: ClipboardList, category: "action",
    configFields: [
      { key: "title", label: "Título", type: "text", required: true, placeholder: "Título da tarefa" },
      { key: "description", label: "Descrição", type: "textarea", placeholder: "Descrição" },
    ],
  },
  {
    id: "send_whatsapp_message", label: "Enviar mensagem WhatsApp", description: "Envia uma mensagem via WhatsApp", icon: Send, category: "action",
    configFields: [
      { key: "session_id", label: "Sessão WhatsApp", type: "text", required: true, placeholder: "ID da sessão" },
      { key: "phone", label: "Telefone", type: "text", required: true, placeholder: "5511999999999" },
      { key: "message", label: "Mensagem", type: "textarea", required: true, placeholder: "Texto da mensagem" },
    ],
  },
  {
    id: "create_lead", label: "Criar Lead no CRM", description: "Cria um novo lead automaticamente", icon: UserPlus, category: "action",
    configFields: [
      { key: "name", label: "Nome", type: "text", required: true, placeholder: "{{respondent_name}}" },
      { key: "email", label: "E-mail", type: "text", required: true, placeholder: "{{respondent_email}}" },
      { key: "company", label: "Empresa", type: "text", placeholder: "{{institution_name}}" },
      { key: "source", label: "Fonte", type: "text", placeholder: "Formulário" },
      { key: "status", label: "Status", type: "select", options: [{ value: "Novo", label: "Novo" }, { value: "Qualificado", label: "Qualificado" }] },
    ],
  },
  {
    id: "create_account", label: "Criar Conta no CRM", description: "Cria uma nova conta/empresa", icon: Users, category: "action",
    configFields: [
      { key: "name", label: "Nome da empresa", type: "text", required: true, placeholder: "{{institution_name}}" },
      { key: "industry", label: "Setor", type: "text", placeholder: "Educação" },
      { key: "country", label: "País", type: "text", placeholder: "Angola" },
    ],
  },
  {
    id: "create_contact", label: "Criar Contato no CRM", description: "Cria um novo contato vinculado a uma conta", icon: UserPlus, category: "action",
    configFields: [
      { key: "name", label: "Nome", type: "text", required: true, placeholder: "{{respondent_name}}" },
      { key: "email", label: "E-mail", type: "text", placeholder: "{{respondent_email}}" },
      { key: "account_id", label: "ID da Conta (opcional)", type: "text", placeholder: "Automático se vazio" },
    ],
  },
  {
    id: "create_opportunity", label: "Criar Oportunidade", description: "Cria uma nova oportunidade no pipeline", icon: TrendingUp, category: "action",
    configFields: [
      { key: "name", label: "Nome", type: "text", required: true, placeholder: "Solução IA para {{institution_name}}" },
      { key: "stage", label: "Etapa", type: "text", placeholder: "Qualificação" },
      { key: "estimated_value", label: "Valor estimado", type: "number", placeholder: "3000" },
    ],
  },
  {
    id: "send_email", label: "Enviar E-mail", description: "Envia um e-mail de notificação", icon: Send, category: "action",
    configFields: [
      { key: "to", label: "Destinatário", type: "text", required: true, placeholder: "email@exemplo.com" },
      { key: "subject", label: "Assunto", type: "text", required: true, placeholder: "Assunto do e-mail" },
      { key: "body", label: "Corpo", type: "textarea", required: true, placeholder: "Conteúdo do e-mail" },
    ],
  },
  {
    id: "send_whatsapp_text", label: "Enviar texto WhatsApp", description: "Envia uma mensagem de texto via WhatsApp (Evolution ou Meta Cloud API)", icon: MessageSquare, category: "action",
    configFields: [
      { key: "provider", label: "Provedor", type: "select", options: [{ value: "evolution", label: "Evolution API" }, { value: "meta", label: "Meta Cloud API" }], placeholder: "Selecione o provedor" },
      { key: "session_id", label: "Sessão WhatsApp (Evolution)", type: "text", placeholder: "ID da sessão — apenas Evolution" },
      { key: "connection_id", label: "Conexão WhatsApp (Meta)", type: "text", placeholder: "ID da conexão Meta — apenas Meta" },
      { key: "phone", label: "Telefone", type: "text", required: true, placeholder: "5511999999999 ou {{phone}}" },
      { key: "message", label: "Mensagem", type: "textarea", required: true, placeholder: "Texto da mensagem" },
    ],
  },
  {
    id: "send_whatsapp_image", label: "Enviar imagem WhatsApp", description: "Envia uma imagem via WhatsApp", icon: Image, category: "action",
    configFields: [
      { key: "session_id", label: "Sessão WhatsApp", type: "text", required: true, placeholder: "ID da sessão" },
      { key: "phone", label: "Telefone", type: "text", required: true, placeholder: "5511999999999" },
      { key: "image_url", label: "URL da imagem", type: "text", required: true, placeholder: "https://..." },
      { key: "caption", label: "Legenda (opcional)", type: "text", placeholder: "Legenda da imagem" },
    ],
  },
  {
    id: "send_whatsapp_document", label: "Enviar documento WhatsApp", description: "Envia um documento/arquivo via WhatsApp", icon: FileText, category: "action",
    configFields: [
      { key: "session_id", label: "Sessão WhatsApp", type: "text", required: true, placeholder: "ID da sessão" },
      { key: "phone", label: "Telefone", type: "text", required: true, placeholder: "5511999999999" },
      { key: "document_url", label: "URL do documento", type: "text", required: true, placeholder: "https://..." },
      { key: "filename", label: "Nome do arquivo", type: "text", required: true, placeholder: "proposta.pdf" },
    ],
  },
  {
    id: "send_whatsapp_audio", label: "Enviar áudio WhatsApp", description: "Envia um áudio via WhatsApp", icon: Mic, category: "action",
    configFields: [
      { key: "session_id", label: "Sessão WhatsApp", type: "text", required: true, placeholder: "ID da sessão" },
      { key: "phone", label: "Telefone", type: "text", required: true, placeholder: "5511999999999" },
      { key: "audio_url", label: "URL do áudio", type: "text", required: true, placeholder: "https://..." },
    ],
  },
  {
    id: "send_sms", label: "Enviar SMS", description: "Envia uma mensagem SMS", icon: Smartphone, category: "action",
    configFields: [
      { key: "phone", label: "Telefone", type: "text", required: true, placeholder: "5511999999999" },
      { key: "message", label: "Mensagem", type: "textarea", required: true, placeholder: "Texto do SMS" },
    ],
  },
  {
    id: "wait_for_whatsapp_reply", label: "Aguardar resposta WhatsApp", description: "Pausa o workflow até receber uma resposta via WhatsApp (Evolution ou Meta Cloud API)", icon: Timer, category: "action",
    configFields: [
      { key: "provider", label: "Provedor", type: "select", options: [{ value: "evolution", label: "Evolution API" }, { value: "meta", label: "Meta Cloud API" }], placeholder: "Selecione o provedor" },
      { key: "session_id", label: "Sessão WhatsApp (Evolution)", type: "text", placeholder: "ID da sessão — apenas Evolution" },
      { key: "connection_id", label: "Conexão WhatsApp (Meta)", type: "text", placeholder: "ID da conexão Meta — apenas Meta" },
      { key: "phone", label: "Telefone", type: "text", required: true, placeholder: "5511999999999 ou {{phone}}" },
      { key: "timeout_minutes", label: "Timeout (minutos, opcional)", type: "number", placeholder: "60" },
    ],
  },
];

// ── Conditions ──
export const conditionsCatalog: CatalogItem[] = [
  {
    id: "field_equals", label: "Campo igual a", description: "Verifica se um campo é igual a um valor", icon: Equal, category: "condition",
    configFields: [
      { key: "field", label: "Campo", type: "text", required: true, placeholder: "Ex: score, status" },
      { key: "value", label: "Valor", type: "text", required: true, placeholder: "Valor esperado" },
    ],
  },
  {
    id: "field_contains", label: "Campo contém", description: "Verifica se um campo contém um texto", icon: Search, category: "condition",
    configFields: [
      { key: "field", label: "Campo", type: "text", required: true, placeholder: "Ex: name, email" },
      { key: "value", label: "Contém", type: "text", required: true, placeholder: "Texto a buscar" },
    ],
  },
  {
    id: "field_greater_than", label: "Campo maior que", description: "Verifica se um campo numérico é maior que um valor", icon: TrendingUp, category: "condition",
    configFields: [
      { key: "field", label: "Campo", type: "text", required: true, placeholder: "Ex: score, estimated_value" },
      { key: "value", label: "Valor", type: "number", required: true, placeholder: "50" },
    ],
  },
  {
    id: "field_empty", label: "Campo vazio/não vazio", description: "Verifica se um campo está vazio ou preenchido", icon: HelpCircle, category: "condition",
    configFields: [
      { key: "field", label: "Campo", type: "text", required: true, placeholder: "Ex: email, phone" },
      { key: "operator", label: "Condição", type: "select", options: [{ value: "empty", label: "Está vazio" }, { value: "not_empty", label: "Não está vazio" }], required: true },
    ],
  },
  {
    id: "whatsapp_reply_contains", label: "Resposta WhatsApp contém", description: "Verifica se a resposta recebida contém um texto específico", icon: MessageCircle, category: "condition",
    configFields: [
      { key: "value", label: "Texto a verificar", type: "text", required: true, placeholder: "Ex: sim, não, preço" },
      { key: "case_sensitive", label: "Sensível a maiúsculas", type: "select", options: [{ value: "false", label: "Não" }, { value: "true", label: "Sim" }] },
    ],
  },
  {
    id: "whatsapp_first_message_in_window", label: "Primeira mensagem em janela", description: "Verifica se é a primeira mensagem inbound do contato em N dias (apenas WhatsApp Meta)", icon: Calendar, category: "condition",
    configFields: [
      { key: "window_days", label: "Janela em dias", type: "number", required: true, placeholder: "30" },
    ],
  },
];

export function getCatalogItem(category: string, id: string): CatalogItem | undefined {
  if (category === "trigger") return triggersCatalog.find((t) => t.id === id);
  if (category === "action") return actionsCatalog.find((a) => a.id === id);
  if (category === "condition") return conditionsCatalog.find((c) => c.id === id);
  return undefined;
}
