import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare } from "lucide-react";

interface WhatsAppMessage {
  id: string;
  content: string;
  direction: string;
  message_type: string;
  created_at: string;
  sender_name: string | null;
}

interface DealWhatsAppTabProps {
  dealId: string;
  contactName: string | null;
}

export function DealWhatsAppTab({ dealId, contactName }: DealWhatsAppTabProps) {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState<string | null>(null);

  useEffect(() => {
    fetchPhone();
  }, [dealId]);

  const fetchPhone = async () => {
    // Get deal's lead or contact phone
    const { data: deal } = await supabase
      .from("deals")
      .select("lead_id, contact_id")
      .eq("id", dealId)
      .single();

    if (!deal) { setLoading(false); return; }

    let contactPhone: string | null = null;

    if (deal.lead_id) {
      const { data: lead } = await supabase.from("leads").select("phone").eq("id", deal.lead_id).single();
      contactPhone = lead?.phone || null;
    }
    if (!contactPhone && deal.contact_id) {
      const { data: contact } = await supabase.from("contacts").select("phone").eq("id", deal.contact_id).single();
      contactPhone = contact?.phone || null;
    }

    setPhone(contactPhone);
    if (contactPhone) {
      await fetchMessages(contactPhone);
    } else {
      setLoading(false);
    }
  };

  const fetchMessages = async (contactPhone: string) => {
    const cleanPhone = contactPhone.replace(/\D/g, "");
    const phoneSuffix = cleanPhone.slice(-8);

    const { data } = await supabase
      .from("whatsapp_messages")
      .select("id, content, direction, message_type, created_at, sender_name")
      .ilike("contact_phone", `%${phoneSuffix}%`)
      .order("created_at", { ascending: false })
      .limit(50);

    setMessages(data || []);
    setLoading(false);
  };

  if (loading) return <p className="text-center py-8 text-muted-foreground">Carregando...</p>;

  if (!phone) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Nenhum contato com telefone associado a este deal.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Mensagens de: {contactName || phone}
      </p>
      {messages.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground">Nenhuma mensagem encontrada</p>
      ) : (
        <ScrollArea className="h-[300px]">
          <div className="space-y-2 pr-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    msg.direction === "outbound"
                      ? "bg-primary/20 text-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {msg.sender_name && msg.direction === "inbound" && (
                    <p className="text-[10px] font-medium text-muted-foreground mb-1">{msg.sender_name}</p>
                  )}
                  <p className="break-words">
                    {msg.message_type !== "text" ? `[${msg.message_type}] ` : ""}
                    {msg.content?.substring(0, 500)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(msg.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
