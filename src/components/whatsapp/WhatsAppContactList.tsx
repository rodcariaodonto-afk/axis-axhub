import { Search, Circle, Clock, Headphones, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type SegmentTab = "all" | "open" | "attending" | "waiting" | "group";

interface Tag {
  id: string;
  tag_name: string;
  tag_color: string;
}

interface ContactStatus {
  status: string;
  assigned_to?: string | null;
}

interface Contact {
  id: string;
  phone_number: string;
  display_name?: string;
  unread_count: number;
  last_message_at?: string;
  profile_picture_url?: string;
  color_code?: string;
  priority?: number;
  tags?: Tag[];
  contact_status?: ContactStatus | null;
}

interface Props {
  contacts: Contact[];
  selectedId?: string;
  onSelect: (contact: Contact) => void;
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  open: <Circle className="h-2.5 w-2.5 fill-green-500 text-green-500" />,
  attending: <Headphones className="h-2.5 w-2.5 text-blue-500" />,
  waiting: <Clock className="h-2.5 w-2.5 text-amber-500" />,
  group: <Users className="h-2.5 w-2.5 text-purple-500" />,
};

const TABS: { key: SegmentTab; label: string; shortLabel: string }[] = [
  { key: "all", label: "Todas", shortLabel: "All" },
  { key: "open", label: "Aberto", shortLabel: "Abrt" },
  { key: "attending", label: "Atend.", shortLabel: "Atnd" },
  { key: "waiting", label: "Aguard.", shortLabel: "Agrd" },
  { key: "group", label: "Grupos", shortLabel: "Grp" },
];

export function WhatsAppContactList({ contacts, selectedId, onSelect }: Props) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<SegmentTab>("all");

  const counts: Record<SegmentTab, number> = {
    all: contacts.length,
    open: contacts.filter((c) => c.contact_status?.status === "open").length,
    attending: contacts.filter((c) => c.contact_status?.status === "attending").length,
    waiting: contacts.filter((c) => c.contact_status?.status === "waiting").length,
    group: contacts.filter((c) => c.contact_status?.status === "group").length,
  };

  const filtered = contacts.filter((c) => {
    const matchSearch =
      (c.display_name || "").toLowerCase().includes(search.toLowerCase()) ||
      c.phone_number.includes(search);
    const matchTab =
      activeTab === "all" || c.contact_status?.status === activeTab;
    return matchSearch && matchTab;
  });

  return (
    <div className="flex flex-col h-full border-x border-border">
      {/* Segment tabs - compact */}
      <div className="flex border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 min-w-0 px-1 py-1.5 text-[9px] font-medium transition-colors text-center truncate ${
              activeTab === tab.key
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {counts[tab.key] > 0 && (
              <span className="ml-0.5 opacity-70">{counts[tab.key]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
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

      {/* Contact list */}
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
              <div className="relative">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="bg-primary/20 text-primary text-sm">
                    {(c.display_name || c.phone_number).substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {c.contact_status?.status && (
                  <span className="absolute -bottom-0.5 -right-0.5">
                    {STATUS_ICON[c.contact_status.status]}
                  </span>
                )}
              </div>
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
                {c.tags && c.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {c.tags.slice(0, 3).map((t) => (
                      <span
                        key={t.id}
                        className="text-[8px] px-1.5 py-0 rounded-full text-white font-medium"
                        style={{ backgroundColor: t.tag_color }}
                      >
                        {t.tag_name}
                      </span>
                    ))}
                    {c.tags.length > 3 && (
                      <span className="text-[8px] text-muted-foreground">+{c.tags.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
