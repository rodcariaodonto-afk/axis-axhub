import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { WhatsAppSessionList } from "@/components/whatsapp/WhatsAppSessionList";
import { WhatsAppContactList } from "@/components/whatsapp/WhatsAppContactList";
import { WhatsAppChat } from "@/components/whatsapp/WhatsAppChat";
import { WhatsAppQRDialog } from "@/components/whatsapp/WhatsAppQRDialog";
import { WhatsAppSettingsDialog } from "@/components/whatsapp/WhatsAppSettingsDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings2 } from "lucide-react";

export default function WhatsApp() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>();
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [sending, setSending] = useState(false);

  const [showNewSession, setShowNewSession] = useState(false);
  const [newSessionName, setNewSessionName] = useState("");
  const [creatingSession, setCreatingSession] = useState(false);

  const [showQR, setShowQR] = useState(false);
  const [qrSession, setQrSession] = useState<any>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<any>({});
  const [savingSettings, setSavingSettings] = useState(false);

  const [tenantId, setTenantId] = useState<string>();

  // Load tenant
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("tenant_id").eq("id", user.id).single().then(({ data }) => {
      if (data) setTenantId(data.tenant_id);
    });
  }, [user]);

  // Load sessions
  const loadSessions = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from("whatsapp_sessions")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });
    if (data) setSessions(data);
  }, [tenantId]);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  // Load contacts for selected session
  const loadContacts = useCallback(async () => {
    if (!selectedSessionId) { setContacts([]); return; }
    const { data } = await supabase
      .from("whatsapp_contacts")
      .select("*")
      .eq("session_id", selectedSessionId)
      .order("last_message_at", { ascending: false });
    if (data) setContacts(data);
  }, [selectedSessionId]);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  // Realtime sessions
  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel("whatsapp-sessions-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_sessions" }, (payload) => {
        loadSessions();
        if (payload.eventType === "UPDATE" && (payload.new as any).status === "connected") {
          if (qrSession?.id === (payload.new as any).id) {
            setShowQR(false);
            toast({ title: "WhatsApp conectado!" });
          }
          // Reload contacts when session connects
          if (selectedSessionId === (payload.new as any).id) {
            loadContacts();
          }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenantId, loadSessions, loadContacts, qrSession, selectedSessionId, toast]);

  // Load messages for selected contact
  useEffect(() => {
    if (!selectedContact || !selectedSessionId) { setMessages([]); return; }
    supabase
      .from("whatsapp_messages")
      .select("*")
      .eq("session_id", selectedSessionId)
      .eq("contact_phone", selectedContact.phone_number)
      .order("created_at", { ascending: true })
      .then(({ data }) => { if (data) setMessages(data); });

    // Mark as read
    supabase
      .from("whatsapp_contacts")
      .update({ unread_count: 0 })
      .eq("id", selectedContact.id);
  }, [selectedContact, selectedSessionId]);

  // Realtime messages
  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel("whatsapp-messages-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "whatsapp_messages" }, (payload) => {
        const newMsg = payload.new as any;
        if (selectedContact && newMsg.contact_phone === selectedContact.phone_number && newMsg.session_id === selectedSessionId) {
          setMessages((prev) => [...prev, newMsg]);
        }
        if (newMsg.session_id === selectedSessionId) {
          loadContacts();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenantId, selectedContact, selectedSessionId, loadContacts]);

  // Load settings
  useEffect(() => {
    if (!tenantId) return;
    supabase.from("whatsapp_settings").select("*").eq("tenant_id", tenantId).single().then(({ data }) => {
      if (data) setSettings(data);
    });
  }, [tenantId]);

  // Polling for QR updates + status sync
  useEffect(() => {
    if (!showQR || !qrSession) return;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("whatsapp_sessions")
        .select("qr_code, status, phone_number")
        .eq("id", qrSession.id)
        .single();
      if (data) {
        setQrSession((prev: any) => ({ ...prev, ...data }));
        if (data.status === "connected") {
          setShowQR(false);
          toast({ title: "WhatsApp conectado!" });
          loadSessions();
          loadContacts();
          clearInterval(interval);
        }
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [showQR, qrSession, toast, loadSessions, loadContacts]);

  // Create session
  const handleCreateSession = async () => {
    if (!newSessionName.trim()) return;
    setCreatingSession(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-whatsapp-session", {
        body: { session_name: newSessionName.trim() },
      });
      if (error) throw error;
      setShowNewSession(false);
      setNewSessionName("");
      await loadSessions();
      if (data?.session) {
        setSelectedSessionId(data.session.id);
        setQrSession(data.session);
        setShowQR(true);
      }
      toast({ title: "Sessão criada!" });
    } catch (err: any) {
      toast({ title: "Erro ao criar sessão", description: err.message, variant: "destructive" });
    } finally {
      setCreatingSession(false);
    }
  };

  // Connect / show QR
  const handleConnect = async (session: any) => {
    setQrSession(session);
    setShowQR(true);
    try {
      const { data } = await supabase.functions.invoke("get-whatsapp-qr", {
        body: {},
        headers: {},
      });
      if (data?.status === "connected") {
        setShowQR(false);
        toast({ title: "WhatsApp já está conectado!" });
        loadSessions();
      }
    } catch (err) {
      console.error("QR fetch error:", err);
    }
  };

  // Check status manually
  const handleCheckStatus = async (session: any) => {
    try {
      const { data } = await supabase.functions.invoke("get-whatsapp-qr", {
        body: {},
        headers: {},
      });
      loadSessions();
      if (data?.status === "connected") {
        toast({ title: "Sessão conectada!" });
        loadContacts();
      } else {
        toast({ title: `Status: ${data?.status || "desconhecido"}` });
      }
    } catch (err: any) {
      toast({ title: "Erro ao verificar status", variant: "destructive" });
    }
  };

  // Send message
  const handleSend = async (text: string) => {
    if (!selectedContact || !selectedSessionId) return;
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-whatsapp-message", {
        body: {
          session_id: selectedSessionId,
          phone: selectedContact.phone_number,
          message: text,
          contact_id: selectedContact.id,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  // Save settings
  const handleSaveSettings = async (newSettings: any) => {
    if (!tenantId) return;
    setSavingSettings(true);
    try {
      const payload = { ...newSettings, tenant_id: tenantId };
      delete payload.id;
      delete payload.created_at;
      delete payload.updated_at;

      if (settings?.id) {
        await supabase.from("whatsapp_settings").update(payload).eq("id", settings.id);
      } else {
        await supabase.from("whatsapp_settings").insert(payload);
      }
      setSettings({ ...settings, ...newSettings });
      setShowSettings(false);
      toast({ title: "Configurações salvas!" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSavingSettings(false);
    }
  };

  // Delete session
  const handleDeleteSession = async (id: string) => {
    await supabase.from("whatsapp_sessions").delete().eq("id", id);
    if (selectedSessionId === id) {
      setSelectedSessionId(undefined);
      setSelectedContact(null);
    }
    loadSessions();
  };

  return (
    <div className="h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h1 className="text-lg font-semibold">WhatsApp</h1>
        <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}>
          <Settings2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex h-[calc(100%-53px)]">
        {/* Sessions */}
        <div className="w-56 shrink-0 border-r border-border">
          <WhatsAppSessionList
            sessions={sessions}
            selectedId={selectedSessionId}
            onSelect={setSelectedSessionId}
            onNewSession={() => setShowNewSession(true)}
            onConnect={handleConnect}
            onDelete={handleDeleteSession}
            onCheckStatus={handleCheckStatus}
          />
        </div>

        {/* Contacts */}
        <div className="w-72 shrink-0">
          <WhatsAppContactList
            contacts={contacts}
            selectedId={selectedContact?.id}
            onSelect={(c) => setSelectedContact(c)}
          />
        </div>

        {/* Chat */}
        <div className="flex-1">
          <WhatsAppChat
            messages={messages}
            contactName={selectedContact?.display_name}
            contactPhone={selectedContact?.phone_number}
            onSend={handleSend}
            sending={sending}
          />
        </div>
      </div>

      {/* New Session Dialog */}
      <Dialog open={showNewSession} onOpenChange={setShowNewSession}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova Sessão WhatsApp</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da sessão</Label>
              <Input
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                placeholder="Ex: Vendas, Suporte..."
                onKeyDown={(e) => e.key === "Enter" && handleCreateSession()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewSession(false)}>Cancelar</Button>
            <Button onClick={handleCreateSession} disabled={creatingSession || !newSessionName.trim()}>
              {creatingSession ? "Criando..." : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Dialog */}
      <WhatsAppQRDialog
        open={showQR}
        onOpenChange={setShowQR}
        qrCode={qrSession?.qr_code}
        sessionName={qrSession?.session_name}
        status={qrSession?.status}
      />

      {/* Settings Dialog */}
      <WhatsAppSettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
        settings={settings}
        onSave={handleSaveSettings}
        saving={savingSettings}
      />
    </div>
  );
}
