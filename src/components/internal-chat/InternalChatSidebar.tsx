import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus, Users, User } from "lucide-react";
import { format } from "date-fns";

export interface Conversation {
  id: string;
  type: string;
  name: string | null;
  updated_at: string;
  participants?: { user_id: string; profile_name?: string }[];
  last_message?: string;
  unread_count?: number;
}

interface Props {
  selectedId: string | null;
  onSelect: (conv: Conversation) => void;
  onNewConversation: () => void;
  refreshTrigger: number;
}

export function InternalChatSidebar({ selectedId, onSelect, onNewConversation, refreshTrigger }: Props) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    const fetchConversations = async () => {
      // Get conversations where user is participant
      const { data: participations } = await supabase
        .from("internal_conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      if (!participations || participations.length === 0) {
        setConversations([]);
        return;
      }

      const convIds = participations.map((p) => p.conversation_id);

      const { data: convs } = await supabase
        .from("internal_conversations")
        .select("*")
        .in("id", convIds)
        .order("updated_at", { ascending: false });

      if (!convs) { setConversations([]); return; }

      // Fetch participants + profiles for display names
      const { data: allParticipants } = await supabase
        .from("internal_conversation_participants")
        .select("conversation_id, user_id")
        .in("conversation_id", convIds);

      const userIds = [...new Set((allParticipants || []).map((p) => p.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p.full_name]));

      // Get last message per conversation
      const { data: lastMessages } = await supabase
        .from("internal_messages")
        .select("conversation_id, content, created_at")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: false });

      const lastMsgMap = new Map<string, string>();
      for (const msg of lastMessages || []) {
        if (!lastMsgMap.has(msg.conversation_id)) {
          lastMsgMap.set(msg.conversation_id, msg.content);
        }
      }

      // Count unread
      const { data: unreadMessages } = await supabase
        .from("internal_messages")
        .select("conversation_id, id")
        .in("conversation_id", convIds)
        .is("read_at", null)
        .neq("sender_id", user.id);

      const unreadMap = new Map<string, number>();
      for (const msg of unreadMessages || []) {
        unreadMap.set(msg.conversation_id, (unreadMap.get(msg.conversation_id) || 0) + 1);
      }

      const enriched: Conversation[] = convs.map((c) => {
        const parts = (allParticipants || [])
          .filter((p) => p.conversation_id === c.id)
          .map((p) => ({ user_id: p.user_id, profile_name: profileMap.get(p.user_id) || "Usuário" }));

        let displayName = c.name;
        if (!displayName && c.type === "direct") {
          const other = parts.find((p) => p.user_id !== user.id);
          displayName = other?.profile_name || "Conversa";
        }

        return {
          ...c,
          name: displayName,
          participants: parts,
          last_message: lastMsgMap.get(c.id),
          unread_count: unreadMap.get(c.id) || 0,
        };
      });

      setConversations(enriched);
    };

    fetchConversations();
  }, [user, refreshTrigger]);

  const filtered = conversations.filter((c) =>
    !search || (c.name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">Chat Interno</h2>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNewConversation}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
        </div>
      </div>
      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">Nenhuma conversa</p>
        ) : (
          filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c)}
              className={`w-full text-left px-3 py-2.5 border-b border-border hover:bg-muted/50 transition-colors ${
                selectedId === c.id ? "bg-muted" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                {c.type === "group" ? <Users className="h-4 w-4 text-muted-foreground shrink-0" /> : <User className="h-4 w-4 text-muted-foreground shrink-0" />}
                <span className="text-sm font-medium truncate flex-1">{c.name || "Conversa"}</span>
                {(c.unread_count || 0) > 0 && (
                  <Badge className="h-5 min-w-[20px] text-[10px] px-1.5">{c.unread_count}</Badge>
                )}
              </div>
              {c.last_message && (
                <p className="text-xs text-muted-foreground truncate mt-0.5 ml-6">{c.last_message}</p>
              )}
            </button>
          ))
        )}
      </ScrollArea>
    </div>
  );
}
