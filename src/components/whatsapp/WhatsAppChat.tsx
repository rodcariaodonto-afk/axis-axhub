import { Send, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
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

interface Props {
  messages: Message[];
  contactName?: string;
  contactPhone?: string;
  onSend: (text: string) => void;
  sending?: boolean;
}

export function WhatsAppChat({ messages, contactName, contactPhone, onSend, sending }: Props) {
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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center gap-3">
        <div>
          <p className="text-sm font-medium">{contactName || contactPhone}</p>
          <p className="text-xs text-muted-foreground">{contactPhone}</p>
        </div>
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
