import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { WhatsAppSessionList } from "@/components/whatsapp/WhatsAppSessionList";
import { WhatsAppContactList } from "@/components/whatsapp/WhatsAppContactList";
import { WhatsAppChat } from "@/components/whatsapp/WhatsAppChat";
import { WhatsAppQRDialog } from "@/components/whatsapp/WhatsAppQRDialog";
import { WhatsAppSettingsDialog } from "@/components/whatsapp/WhatsAppSettingsDialog";
import { WhatsAppTagManager } from "@/components/whatsapp/WhatsAppTagManager";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings2 } from "lucide-react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

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

  const [showTagManager, setShowTagManager] = useState(false);

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

  // Load contacts with tags and status
  const loadContacts = useCallback(async () => {
    if (!selectedSessionId) { setContacts([]); return; }
    const { data: contactsData } = await supabase
      .from("whatsapp_contacts")
      .select("*")
      .eq("session_id", selectedSessionId)
      .order("last_message_at", { ascending: false });

    if (!contactsData) { setContacts([]); return; }

    // Load tags and status for all contacts
    const contactIds = contactsData.map((c: any) => c.id);
    const [{ data: tagsData }, { data: statusData }] = await Promise.all([
      supabase.from("whatsapp_contact_tags").select("*").in("contact_id", contactIds),
      supabase.from("whatsapp_contact_status").select("*").in("contact_id", contactIds),
    ]);

    const enriched = contactsData.map((c: any) => ({
      ...c,
      tags: (tagsData || []).filter((t: any) => t.contact_id === c.id),
      contact_status: (statusData || []).find((s: any) => s.contact_id === c.id) || null,
    }));

    setContacts(enriched);
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

    // Zero unread and refresh contacts list
    supabase
      .from("whatsapp_contacts")
      .update({ unread_count: 0 })
      .eq("id", selectedContact.id)
      .then(() => {
        loadContacts();
        setSelectedContact((prev: any) => prev ? { ...prev, unread_count: 0 } : prev);
      });
  }, [selectedContact?.id, selectedSessionId]);

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

  // Polling for QR updates
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

  const handleConnect = async (session: any) => {
    setQrSession(session);
    setShowQR(true);
    try {
      const { data } = await supabase.functions.invoke("get-whatsapp-qr", {
        body: { session_id: session.id },
      });
      if (data?.status === "connected") {
        setShowQR(false);
        toast({ title: "WhatsApp já está conectado!" });
        loadSessions();
        loadContacts();
      } else if (data?.qr_code) {
        setQrSession((prev: any) => ({ ...prev, qr_code: data.qr_code }));
      }
    } catch (err) {
      console.error("QR fetch error:", err);
    }
  };

  const handleCheckStatus = async (session: any) => {
    try {
      const { data } = await supabase.functions.invoke("get-whatsapp-qr", {
        body: { session_id: session.id },
      });
      loadSessions();
      if (data?.status === "connected") {
        toast({ title: "Sessão conectada!" });
        loadContacts();
      } else {
        toast({ title: `Status: ${data?.status || "desconhecido"}` });
      }
    } catch {
      toast({ title: "Erro ao verificar status", variant: "destructive" });
    }
  };

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

      // Auto-status: when sending a message, change status to "attending"
      if (!selectedContact.is_group && tenantId) {
        const currentStatus = selectedContact.contact_status?.status;
        if (currentStatus === "waiting" || currentStatus === "open") {
          const { data: statusRow } = await supabase
            .from("whatsapp_contact_status")
            .select("id")
            .eq("contact_id", selectedContact.id)
            .single();
          if (statusRow) {
            await supabase.from("whatsapp_contact_status")
              .update({ status: "attending", last_status_change: new Date().toISOString() })
              .eq("id", statusRow.id);
          } else {
            await supabase.from("whatsapp_contact_status").insert({
              tenant_id: tenantId,
              contact_id: selectedContact.id,
              status: "attending",
            });
          }
          setSelectedContact((prev: any) => ({
            ...prev,
            contact_status: { ...(prev?.contact_status || {}), status: "attending" },
          }));
          loadContacts();
        }
      }
    } catch (err: any) {
      toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

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

  const handleDeleteSession = async (id: string) => {
    await supabase.from("whatsapp_sessions").delete().eq("id", id);
    if (selectedSessionId === id) {
      setSelectedSessionId(undefined);
      setSelectedContact(null);
    }
    loadSessions();
  };

  // Delete chat (contact + messages)
  const handleDeleteChat = async () => {
    if (!selectedContact) return;
    // Delete messages first, then contact (cascade handles tags/status)
    await supabase.from("whatsapp_messages").delete().eq("contact_id", selectedContact.id);
    await supabase.from("whatsapp_contact_tags").delete().eq("contact_id", selectedContact.id);
    await supabase.from("whatsapp_contact_status").delete().eq("contact_id", selectedContact.id);
    await supabase.from("whatsapp_contacts").delete().eq("id", selectedContact.id);
    setSelectedContact(null);
    setMessages([]);
    loadContacts();
    toast({ title: "Conversa apagada!" });
  };

  // Change contact status
  const handleStatusChange = async (newStatus: string) => {
    if (!selectedContact || !tenantId) return;
    const { data: existing } = await supabase
      .from("whatsapp_contact_status")
      .select("id")
      .eq("contact_id", selectedContact.id)
      .single();

    if (existing) {
      await supabase.from("whatsapp_contact_status")
        .update({ status: newStatus, last_status_change: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabase.from("whatsapp_contact_status").insert({
        tenant_id: tenantId,
        contact_id: selectedContact.id,
        status: newStatus,
      });
    }

    // Update local state
    setSelectedContact((prev: any) => ({
      ...prev,
      contact_status: { ...(prev?.contact_status || {}), status: newStatus },
    }));
    loadContacts();
  };

  return (
    <div className="h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h1 className="text-lg font-semibold">WhatsApp</h1>
        <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}>
          <Settings2 className="h-4 w-4" />
        </Button>
      </div>

      <ResizablePanelGroup direction="horizontal" className="h-[calc(100%-53px)]">
        <ResizablePanel defaultSize={15} minSize={10}>
          <WhatsAppSessionList
            sessions={sessions}
            selectedId={selectedSessionId}
            onSelect={setSelectedSessionId}
            onNewSession={() => setShowNewSession(true)}
            onConnect={handleConnect}
            onDelete={handleDeleteSession}
            onCheckStatus={handleCheckStatus}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={25} minSize={15}>
          <WhatsAppContactList
            contacts={contacts}
            selectedId={selectedContact?.id}
            onSelect={(c) => setSelectedContact(c)}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={60} minSize={30}>
          <WhatsAppChat
            messages={messages}
            contactName={selectedContact?.display_name}
            contactPhone={selectedContact?.phone_number}
            contactStatus={selectedContact?.contact_status?.status || "open"}
            contactTags={selectedContact?.tags || []}
            isGroup={selectedContact?.is_group === true}
            onSend={handleSend}
            onStatusChange={handleStatusChange}
            onOpenTags={() => setShowTagManager(true)}
            onDeleteChat={handleDeleteChat}
            sending={sending}
          />
        </ResizablePanel>
      </ResizablePanelGroup>

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

      <WhatsAppQRDialog
        open={showQR}
        onOpenChange={setShowQR}
        qrCode={qrSession?.qr_code}
        sessionName={qrSession?.session_name}
        status={qrSession?.status}
      />

      <WhatsAppSettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
        settings={settings}
        onSave={handleSaveSettings}
        saving={savingSettings}
      />

      {/* Tag Manager */}
      {selectedContact && tenantId && (
        <WhatsAppTagManager
          open={showTagManager}
          onOpenChange={setShowTagManager}
          contactId={selectedContact.id}
          tenantId={tenantId}
          tags={selectedContact.tags || []}
          onTagsChanged={() => {
            loadContacts();
            // Refresh selected contact tags
            supabase.from("whatsapp_contact_tags")
              .select("*")
              .eq("contact_id", selectedContact.id)
              .then(({ data }) => {
                if (data) setSelectedContact((prev: any) => ({ ...prev, tags: data }));
              });
          }}
        />
      )}
    </div>
  );
}
