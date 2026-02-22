import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Contact {
  id: string;
  phone_number: string;
  display_name?: string;
  unread_count: number;
  last_message_at?: string;
  profile_picture_url?: string;
}

interface Props {
  contacts: Contact[];
  selectedId?: string;
  onSelect: (contact: Contact) => void;
}

export function WhatsAppContactList({ contacts, selectedId, onSelect }: Props) {
  const [search, setSearch] = useState("");

  const filtered = contacts.filter(
    (c) =>
      (c.display_name || "").toLowerCase().includes(search.toLowerCase()) ||
      c.phone_number.includes(search)
  );

  return (
    <div className="flex flex-col h-full border-x border-border">
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar contato..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="divide-y divide-border">
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum contato</p>
          )}
          {filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => onSelect(c)}
              className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                selectedId === c.id ? "bg-secondary" : "hover:bg-secondary/50"
              }`}
            >
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarFallback className="bg-primary/20 text-primary text-sm">
                  {(c.display_name || c.phone_number).substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium truncate">{c.display_name || c.phone_number}</p>
                  {c.last_message_at && (
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(c.last_message_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground truncate">{c.phone_number}</p>
                  {c.unread_count > 0 && (
                    <Badge className="h-5 min-w-[20px] text-[10px] bg-primary text-primary-foreground">
                      {c.unread_count}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
