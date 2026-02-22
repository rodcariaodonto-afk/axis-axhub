import { Send, MessageCircle, Tag, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRef, useEffect, useState } from "react";
import { format } from "date-fns";

interface Message {
  id: string;
  content?: string;
  direction: string;
  message_type: string;
  created_at: string;
  sender_name?: string;
  status?: string;
}

interface TagItem {
  id: string;
  tag_name: string;
  tag_color: string;
}

interface Props {
  messages: Message[];
  contactName?: string;
  contactPhone?: string;
  contactStatus?: string;
  contactTags?: TagItem[];
  onSend: (text: string) => void;
  onStatusChange?: (status: string) => void;
  onOpenTags?: () => void;
  sending?: boolean;
}

const STATUS_OPTIONS = [
  { value: "open", label: "Aberto", color: "text-green-500" },
  { value: "attending", label: "Atendendo", color: "text-blue-500" },
  { value: "waiting", label: "Aguardando", color: "text-amber-500" },
  { value: "closed", label: "Fechado", color: "text-muted-foreground" },
];

export function WhatsAppChat({
  messages, contactName, contactPhone, contactStatus, contactTags,
  onSend, onStatusChange, onOpenTags, sending
}: Props) {
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!text.trim() || sending) return;
    onSend(text.trim());
    setText("");
  };

  if (!contactPhone) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
        <MessageCircle className="h-12 w-12" />
        <p className="text-sm">Selecione um contato para iniciar</p>
      </div>
    );
  }

  const currentStatusLabel = STATUS_OPTIONS.find((s) => s.value === contactStatus)?.label || "Aberto";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">{contactName || contactPhone}</p>
            {/* Status dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-5 px-2 text-[10px] gap-1">
                  {currentStatusLabel}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {STATUS_OPTIONS.map((opt) => (
                  <DropdownMenuItem
                    key={opt.value}
                    onClick={() => onStatusChange?.(opt.value)}
                    className={opt.color}
                  >
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-muted-foreground">{contactPhone}</p>
            {/* Tags */}
            {contactTags && contactTags.length > 0 && (
              <div className="flex gap-1">
                {contactTags.map((t) => (
                  <span
                    key={t.id}
                    className="text-[8px] px-1.5 rounded-full text-white font-medium"
                    style={{ backgroundColor: t.tag_color }}
                  >
                    {t.tag_name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onOpenTags}>
          <Tag className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg) => {
          const isOutbound = msg.direction === "outbound";
          return (
            <div key={msg.id} className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                  isOutbound
                    ? "bg-primary text-primary-foreground rounded-br-none"
                    : "bg-secondary text-secondary-foreground rounded-bl-none"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{msg.content || "[media]"}</p>
                <p className={`text-[10px] mt-1 ${isOutbound ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {format(new Date(msg.created_at), "HH:mm")}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border flex gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Digite sua mensagem..."
          className="min-h-[40px] max-h-[120px] resize-none"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button onClick={handleSend} disabled={!text.trim() || sending} size="icon" className="shrink-0 self-end">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
