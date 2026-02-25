import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import type { Conversation } from "./InternalChatSidebar";

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender_name?: string;
}

interface Props {
  conversation: Conversation | null;
  onMessageSent: () => void;
}

export function InternalChatWindow({ conversation, onMessageSent }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!conversation) { setMessages([]); return; }

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("internal_messages")
        .select("*")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: true });

      if (!data) return;

      // Get sender names
      const senderIds = [...new Set(data.map((m) => m.sender_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", senderIds);

      const nameMap = new Map((profiles || []).map((p) => [p.id, p.full_name]));

      setMessages(data.map((m) => ({ ...m, sender_name: nameMap.get(m.sender_id) || "Usuário" })));

      // Mark as read
      if (user) {
        await supabase
          .from("internal_messages")
          .update({ read_at: new Date().toISOString() })
          .eq("conversation_id", conversation.id)
          .neq("sender_id", user.id)
          .is("read_at", null);
      }
    };

    fetchMessages();

    // Realtime subscription
    const channel = supabase
      .channel(`internal-chat-${conversation.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "internal_messages",
        filter: `conversation_id=eq.${conversation.id}`,
      }, (payload) => {
        const newMsg = payload.new as any;
        // Get sender name from participants
        const participant = conversation.participants?.find((p) => p.user_id === newMsg.sender_id);
        setMessages((prev) => [...prev, { ...newMsg, sender_name: participant?.profile_name || "Usuário" }]);
        // Mark as read if not sender
        if (user && newMsg.sender_id !== user.id) {
          supabase.from("internal_messages").update({ read_at: new Date().toISOString() }).eq("id", newMsg.id);
        }
        onMessageSent();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversation?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || !conversation || !user || sending) return;
    setSending(true);
    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
    if (!profile) { setSending(false); return; }

    await supabase.from("internal_messages").insert({
      conversation_id: conversation.id,
      sender_id: user.id,
      content: text.trim(),
      tenant_id: profile.tenant_id,
    });

    // Update conversation updated_at
    await supabase.from("internal_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversation.id);

    // Send notification to other participants
    const { data: senderProfile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
    const senderName = senderProfile?.full_name || "Alguém";
    const otherParticipants = (conversation.participants || []).filter((p) => p.user_id !== user.id);
    if (otherParticipants.length > 0) {
      const notifications = otherParticipants.map((p) => ({
        tenant_id: profile.tenant_id,
        recipient_id: p.user_id,
        notification_type_id: "internal_chat_message",
        title: `Nova mensagem de ${senderName}`,
        message: text.trim().length > 80 ? text.trim().substring(0, 80) + "..." : text.trim(),
        priority: "normal",
        action_url: "/chat-interno",
      }));
      await supabase.from("notifications").insert(notifications);
    }

    setText("");
    setSending(false);
    onMessageSent();
  };

  if (!conversation) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
        <MessageSquare className="h-12 w-12" />
        <p className="text-sm">Selecione uma conversa ou crie uma nova</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <p className="text-sm font-medium">{conversation.name || "Conversa"}</p>
        <p className="text-xs text-muted-foreground">
          {conversation.participants?.map((p) => p.profile_name).join(", ")}
        </p>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg) => {
          const isMe = msg.sender_id === user?.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                isMe
                  ? "bg-primary text-primary-foreground rounded-br-none"
                  : "bg-secondary text-secondary-foreground rounded-bl-none"
              }`}>
                {!isMe && (
                  <p className="text-xs font-semibold mb-0.5 opacity-80">{msg.sender_name}</p>
                )}
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                <p className={`text-[10px] mt-1 ${isMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
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
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
          }}
        />
        <Button onClick={handleSend} disabled={!text.trim() || sending} size="icon" className="shrink-0 self-end">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
