import {
  Webhook, Megaphone, Tag, MessageCircle, Image, Clock, UserCog,
  GitBranch, MessageSquare, XCircle, Tags, Zap,
} from "lucide-react";

export type BlockCategory = "gatilho" | "acao" | "logica" | "saida";

export interface BlockTypeDefinition {
  type: string;
  label: string;
  category: BlockCategory;
  icon: typeof Webhook;
  color: string;
  description: string;
  handles: { sources: string[]; targets: string[] };
  configFields?: ConfigField[];
}

export interface ConfigField {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "select";
  placeholder?: string;
  options?: { label: string; value: string }[];
  defaultValue?: string | number;
}

export const BLOCK_TYPES: BlockTypeDefinition[] = [
  // Gatilhos
  {
    type: "webhook",
    label: "Webhook",
    category: "gatilho",
    icon: Webhook,
    color: "hsl(142, 76%, 36%)",
    description: "Recebe chamada HTTP externa",
    handles: { sources: ["default"], targets: [] },
    configFields: [
      { key: "url", label: "URL do Webhook", type: "text", placeholder: "Gerado automaticamente" },
    ],
  },
  {
    type: "inicio_campanha",
    label: "Início de Campanha",
    category: "gatilho",
    icon: Megaphone,
    color: "hsl(142, 76%, 36%)",
    description: "Dispara ao iniciar uma campanha",
    handles: { sources: ["default"], targets: [] },
  },
  {
    type: "tag_adicionada",
    label: "Tag Adicionada",
    category: "gatilho",
    icon: Tag,
    color: "hsl(142, 76%, 36%)",
    description: "Dispara quando uma tag é adicionada ao contato",
    handles: { sources: ["default"], targets: [] },
    configFields: [
      { key: "tag_name", label: "Nome da Tag", type: "text", placeholder: "Ex: interessado" },
    ],
  },
  // Ações
  {
    type: "enviar_texto",
    label: "Enviar Texto",
    category: "acao",
    icon: MessageCircle,
    color: "hsl(217, 91%, 60%)",
    description: "Envia mensagem de texto via WhatsApp",
    handles: { sources: ["default"], targets: ["default"] },
    configFields: [
      { key: "mensagem", label: "Mensagem", type: "textarea", placeholder: "Olá {{nome}}!" },
      { key: "session_id", label: "Sessão WhatsApp", type: "text", placeholder: "ID da sessão" },
    ],
  },
  {
    type: "enviar_midia",
    label: "Enviar Mídia",
    category: "acao",
    icon: Image,
    color: "hsl(217, 91%, 60%)",
    description: "Envia imagem, áudio ou documento",
    handles: { sources: ["default"], targets: ["default"] },
    configFields: [
      { key: "media_url", label: "URL da Mídia", type: "text", placeholder: "https://..." },
      { key: "caption", label: "Legenda", type: "text", placeholder: "Opcional" },
      { key: "session_id", label: "Sessão WhatsApp", type: "text", placeholder: "ID da sessão" },
    ],
  },
  {
    type: "delay",
    label: "Delay",
    category: "acao",
    icon: Clock,
    color: "hsl(217, 91%, 60%)",
    description: "Aguarda um tempo antes de continuar",
    handles: { sources: ["default"], targets: ["default"] },
    configFields: [
      { key: "segundos", label: "Segundos", type: "number", defaultValue: 10 },
    ],
  },
  {
    type: "atualizar_contato",
    label: "Atualizar Contato",
    category: "acao",
    icon: UserCog,
    color: "hsl(217, 91%, 60%)",
    description: "Atualiza dados do contato",
    handles: { sources: ["default"], targets: ["default"] },
    configFields: [
      { key: "campo", label: "Campo", type: "text", placeholder: "Ex: nome" },
      { key: "valor", label: "Valor", type: "text", placeholder: "Novo valor" },
    ],
  },
  // Lógica
  {
    type: "condicao",
    label: "Condição If/Else",
    category: "logica",
    icon: GitBranch,
    color: "hsl(38, 92%, 50%)",
    description: "Bifurca o fluxo com base em uma condição",
    handles: { sources: ["sim", "nao"], targets: ["default"] },
    configFields: [
      { key: "campo", label: "Campo", type: "text", placeholder: "Ex: resposta" },
      { key: "operador", label: "Operador", type: "select", options: [
        { label: "Igual a", value: "igual" },
        { label: "Contém", value: "contem" },
        { label: "Diferente de", value: "diferente" },
        { label: "Maior que", value: "maior" },
        { label: "Menor que", value: "menor" },
      ]},
      { key: "valor", label: "Valor", type: "text", placeholder: "Valor para comparar" },
    ],
  },
  {
    type: "aguardar_resposta",
    label: "Aguardar Resposta",
    category: "logica",
    icon: MessageSquare,
    color: "hsl(38, 92%, 50%)",
    description: "Aguarda resposta do contato",
    handles: { sources: ["default"], targets: ["default"] },
    configFields: [
      { key: "timeout_segundos", label: "Timeout (segundos)", type: "number", defaultValue: 3600 },
    ],
  },
  // Saída
  {
    type: "fim",
    label: "Fim do Fluxo",
    category: "saida",
    icon: XCircle,
    color: "hsl(0, 84%, 60%)",
    description: "Encerra o fluxo",
    handles: { sources: [], targets: ["default"] },
  },
  {
    type: "adicionar_tag",
    label: "Adicionar Tag",
    category: "saida",
    icon: Tags,
    color: "hsl(0, 84%, 60%)",
    description: "Adiciona tag ao contato e encerra",
    handles: { sources: [], targets: ["default"] },
    configFields: [
      { key: "tag_name", label: "Nome da Tag", type: "text", placeholder: "Ex: qualificado" },
    ],
  },
];

export const BLOCK_CATEGORIES: { key: BlockCategory; label: string; icon: typeof Zap }[] = [
  { key: "gatilho", label: "Gatilhos", icon: Zap },
  { key: "acao", label: "Ações", icon: MessageCircle },
  { key: "logica", label: "Lógica", icon: GitBranch },
  { key: "saida", label: "Saída", icon: XCircle },
];

export function getBlockType(type: string): BlockTypeDefinition | undefined {
  return BLOCK_TYPES.find((b) => b.type === type);
}
