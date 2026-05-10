import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useToast } from "@/hooks/use-toast";
import { WhatsAppSessionList } from "@/components/whatsapp/WhatsAppSessionList";
import { WhatsAppContactList } from "@/components/whatsapp/WhatsAppContactList";
import { WhatsAppChat } from "@/components/whatsapp/WhatsAppChat";
import { WhatsAppQRDialog } from "@/components/whatsapp/WhatsAppQRDialog";
import { WhatsAppSettingsDialog } from "@/components/whatsapp/WhatsAppSettingsDialog";
import { WhatsAppTagManager } from "@/components/whatsapp/WhatsAppTagManager";
import { TransferConversationModal } from "@/components/whatsapp/TransferConversationModal";
import { MetaConnectionModal } from "@/components/whatsapp/MetaConnectionModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings2 } from "lucide-react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

export default function WhatsApp() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isAdmin } = useUserPermissions();

  const [adminUserIds, setAdminUserIds] = useState<string[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});

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
  const [showTransfer, setShowTransfer] = useState(false);

  // Meta API
  const [showMetaModal, setShowMetaModal] = useState(false);
  const [editingMetaConnection, setEditingMetaConnection] = useState<any>(null);

  const [tenantId, setTenantId] = useState<string>();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("tenant_id").eq("id", user.id).single().then(async ({ data }) => {
      if (!data) return;
      setTenantId(data.tenant_id);
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").eq("tenant_id", data.tenant_id);
      if (profiles) {
        const pMap: Record<string, string> = {};
        profiles.forEach((p: any) => { pMap[p.id] = p.full_name || "Sem nome"; });
        setProfilesMap(pMap);
        const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "admin").in("user_id", profiles.map((p: any) => p.id));
        if (roles) setAdminUserIds(roles.map((r: any) => r.user_id));
      }
    });
  }, [user]);

  const loadSessions = useCallback(async () => {
    if (!tenantId || !user) return;

    const [{ data: evolutionSessions }, { data: assignedContacts }, { data: metaConnections }] = await Promise.all([
      supabase.from("whatsapp_sessions").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }),
      supabase.from("whatsapp_contact_status").select("contact_id, whatsapp_contacts!inner(session_id)").eq("tenant_id", tenantId).eq("assigned_to", user.id),
      supabase.from("whatsapp_meta_connections").select("id, name, phone_number, phone_number_id, waba_id, webhook_url, webhook_verify_token, status, is_active, created_at").eq("tenant_id", tenantId).eq("is_active", true),
    ]);

    const assignedSessionIds = new Set(
      (assignedContacts || []).map((ac: any) => ac.whatsapp_contacts?.session_id).filter(Boolean)
    );

    const visibleEvolution = (evolutionSessions || []).filter((s: any) => {
      if (assignedSessionIds.has(s.id)) return true;
      const owner = s.owner_user_id;
      if (!owner || owner === user.id) return true;
      if (isAdmin && adminUserIds.includes(owner)) return false;
      return true;
    });

    // Mapear conexões Meta para o formato de sessão
    const metaSessions = (metaConnections || []).map((c: any) => ({
      id: c.id,
      session_name: c.name,
      status: c.status === "connected" ? "connected" : "disconnected",
      phone_number: c.phone_number,
      connection_type: "meta",
      phone_number_id: c.phone_number_id,
      waba_id: c.waba_id,
      webhook_url: c.webhook_url,
      webhook_verify_token: c.webhook_verify_token,
      created_at: c.created_at,
    }));

    setSessions([...visibleEvolution, ...metaSessions]);
  }, [tenantId, user, isAdmin, adminUserIds]);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  const loadContactsImmediate = useCallback(async () => {
    if (!selectedSessionId) { setContacts([]); return; }

    // Verificar se é sessão Meta
    const selectedSession = sessions.find((s: any) => s.id === selectedSessionId);
    if (selectedSession?.connection_type === "meta") {
      const { data: metaMsgs } = await supabase
        .from("whatsapp_meta_messages")
        .select("phone_number, message_content, created_at, direction")
        .eq("connection_id", selectedSessionId)
        .order("created_at", { ascending: false });
      if (!metaMsgs) { setContacts([]); return; }
      const seen = new Set<string>();
      const uniqueContacts = metaMsgs
        .filter((m: any) => { if (seen.has(m.phone_number)) return false; seen.add(m.phone_number); return true; })
        .map((m: any) => ({ id: m.phone_number, phone_number: m.phone_number, display_name: m.phone_number, last_message_at: m.created_at, last_message: m.message_content, tags: [], contact_status: null, is_meta: true }));
      setContacts(uniqueContacts);
      return;
    }

    const { data: contactsData } = await supabase.from("whatsapp_contacts").select("*").eq("session_id", selectedSessionId).order("last_message_at", { ascending: false });
    if (!contactsData) { setContacts([]); return; }

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

    const visible = enriched.filter((c: any) => {
      const assignedTo = c.contact_status?.assigned_to;
      if (assignedTo === user?.id) return true;
      if (isAdmin && assignedTo && adminUserIds.includes(assignedTo)) return false;
      if (!assignedTo && selectedSession?.owner_user_id && selectedSession.owner_user_id !== user?.id && adminUserIds.includes(selectedSession.owner_user_id)) return false;
      return true;
    });

    setContacts(visible);
  }, [selectedSessionId, sessions, user?.id, isAdmin, adminUserIds]);

  const loadContacts = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { loadContactsImmediate(); }, 300);
  }, [loadContactsImmediate]);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase.channel("whatsapp-sessions-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_sessions" }, () => { loadSessions(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_meta_connections" }, () => { loadSessions(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenantId, loadSessions]);

  useEffect(() => {
    if (!selectedContact || !selectedSessionId) { setMessages([]); return; }
    const selectedSession = sessions.find((s: any) => s.id === selectedSessionId);
    if (selectedSession?.connection_type === "meta") {
      supabase
        .from("whatsapp_meta_messages")
        .select("*")
        .eq("connection_id", selectedSessionId)
        .eq("phone_number", selectedContact.phone_number)
        .order("created_at", { ascending: true })
        .limit(200)
        .then(({ data }) => {
          if (data) setMessages(data.map((m: any) => ({
            ...m,
            content: m.message_content,
            direction: m.direction,
            message_type: m.message_type || "text",
          })));
        });
      return;
    }
    supabase.from("whatsapp_messages").select("*").eq("session_id", selectedSessionId).eq("contact_phone", selectedContact.phone_number).order("created_at", { ascending: true }).limit(200).then(({ data }) => { if (data) setMessages(data); });
    supabase.from("whatsapp_contacts").update({ unread_count: 0 }).eq("id", selectedContact.id).then(() => {
      loadContacts();
      setSelectedContact((prev: any) => prev ? { ...prev, unread_count: 0 } : prev);
    });
  }, [selectedContact?.id, selectedSessionId, sessions]);

  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase.channel("whatsapp-messages-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "whatsapp_messages" }, (payload) => {
        const newMsg = payload.new as any;
        if (selectedContact && newMsg.contact_phone === selectedContact.phone_number && newMsg.session_id === selectedSessionId) {
          setMessages((prev) => [...prev, newMsg]);
        }
        if (newMsg.session_id === selectedSessionId) loadContacts();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "whatsapp_meta_messages" }, (payload) => {
        const newMsg = payload.new as any;
        if (selectedContact && newMsg.phone_number === selectedContact.phone_number && newMsg.connection_id === selectedSessionId) {
          setMessages((prev) => [...prev, { ...newMsg, content: newMsg.message_content }]);
        }
        if (newMsg.connection_id === selectedSessionId) loadContacts();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenantId, selectedContact, selectedSessionId, loadContacts]);

  useEffect(() => {
    if (!tenantId) return;
    supabase.from("whatsapp_settings").select("*").eq("tenant_id", tenantId).single().then(({ data }) => { if (data) setSettings(data); });
  }, [tenantId]);

  useEffect(() => {
    if (!showQR || !qrSession) return;
    const interval = setInterval(async () => {
      const { data } = await supabase.from("whatsapp_sessions").select("qr_code, status, phone_number").eq("id", qrSession.id).single();
      if (data) {
        setQrSession((prev: any) => ({ ...prev, ...data }));
        if (data.status === "connected") {
          setShowQR(false);
          toast({ title: "WhatsApp conectado!" });
          loadSessions(); loadContacts();
          clearInterval(interval);
        }
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [showQR, qrSession, toast, loadSessions, loadContacts]);

  const handleCreateSession = async () => {
    if (!newSessionName.trim()) return;
    setCreatingSession(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-whatsapp-session", { body: { session_name: newSessionName.trim() } });
      if (error) throw error;
      setShowNewSession(false);
      setNewSessionName("");
      await loadSessions();
      if (data?.session) { setSelectedSessionId(data.session.id); setQrSession(data.session); setShowQR(true); }
      toast({ title: "Sessão criada!" });
    } catch (err: any) {
      toast({ title: "Erro ao criar sessão", description: err.message, variant: "destructive" });
    } finally {
      setCreatingSession(false);
    }
  };

  const handleConnect = async (session: any) => {
    if (session.connection_type === "meta") return;
    setQrSession(session); setShowQR(true);
    try {
      const { data } = await supabase.functions.invoke("get-whatsapp-qr", { body: { session_id: session.id } });
      if (data?.status === "connected") { setShowQR(false); toast({ title: "WhatsApp já está conectado!" }); loadSessions(); loadContacts(); }
      else if (data?.qr_code) { setQrSession((prev: any) => ({ ...prev, qr_code: data.qr_code })); }
    } catch (err) { console.error("QR fetch error:", err); }
  };

  const handleCheckStatus = async (session: any) => {
    if (session.connection_type === "meta") return;
    try {
      const { data } = await supabase.functions.invoke("get-whatsapp-qr", { body: { session_id: session.id } });
      loadSessions();
      if (data?.status === "connected") { toast({ title: "Sessão conectada!" }); loadContacts(); }
      else { toast({ title: `Status: ${data?.status || "desconhecido"}` }); }
    } catch { toast({ title: "Erro ao verificar status", variant: "destructive" }); }
  };

  const handleSend = async (text: string) => {
    if (!selectedContact || !selectedSessionId) return;
    setSending(true);
    try {
      const selectedSession = sessions.find((s: any) => s.id === selectedSessionId);
      if (selectedSession?.connection_type === "meta") {
        const { error } = await supabase.functions.invoke("send-whatsapp-meta-message", {
          body: { connection_id: selectedSessionId, phone_number: selectedContact.phone_number, message_type: "text", message_content: text },
        });
        if (error) throw error;
        // Atualizar mensagens localmente
        setMessages((prev: any) => [...prev, { id: Date.now().toString(), content: text, message_content: text, direction: "outbound", message_type: "text", created_at: new Date().toISOString() }]);
        loadContacts();
      } else {
        const { error } = await supabase.functions.invoke("send-whatsapp-message", { body: { session_id: selectedSessionId, phone: selectedContact.phone_number, message: text, contact_id: selectedContact.id } });
        if (error) throw error;
        await autoAssignOnSend();
      }
    } catch (err: any) {
      toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
    } finally { setSending(false); }
  };

  const handleSendMedia = async (file: File, mediaType: string, caption?: string) => {
    if (!selectedContact || !selectedSessionId || !tenantId) return;
    setSending(true);
    try {
      const ext = (file.name.split(".").pop() || "bin").toLowerCase();
      const filePath = `${tenantId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("whatsapp-media").upload(filePath, file, { contentType: file.type || "application/octet-stream" });
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabase.storage.from("whatsapp-media").getPublicUrl(filePath);
      const publicUrl = publicUrlData.publicUrl;

      const selectedSession = sessions.find((s: any) => s.id === selectedSessionId);
      if (selectedSession?.connection_type === "meta") {
        const { error } = await supabase.functions.invoke("send-whatsapp-meta-message", {
          body: {
            connection_id: selectedSessionId,
            phone_number: selectedContact.phone_number,
            message_type: "media",
            media_type: mediaType,
            media_url: publicUrl,
            message_content: caption || "",
          },
        });
        if (error) throw error;
        setMessages((prev: any) => [...prev, { id: Date.now().toString(), content: JSON.stringify({ url: publicUrl, caption: caption || "" }), message_content: caption || "", direction: "outbound", message_type: mediaType, created_at: new Date().toISOString() }]);
        loadContacts();
      } else {
        const { error } = await supabase.functions.invoke("send-whatsapp-message", { body: { session_id: selectedSessionId, phone: selectedContact.phone_number, contact_id: selectedContact.id, media_url: publicUrl, media_type: mediaType, file_name: file.name, caption: caption || "" } });
        if (error) throw error;
        await autoAssignOnSend();
      }
    } catch (err: any) {
      toast({ title: "Erro ao enviar mídia", description: err.message, variant: "destructive" });
    } finally { setSending(false); }
  };

  const autoAssignOnSend = async () => {
    if (!selectedContact || selectedContact.is_group || !tenantId || !user) return;
    const currentStatus = selectedContact.contact_status?.status;
    if (currentStatus === "waiting" || currentStatus === "open" || !selectedContact.contact_status?.assigned_to) {
      const { data: statusRow } = await supabase.from("whatsapp_contact_status").select("id").eq("contact_id", selectedContact.id).single();
      if (statusRow) {
        await supabase.from("whatsapp_contact_status").update({ status: "attending", assigned_to: user.id, last_status_change: new Date().toISOString() }).eq("id", statusRow.id);
      } else {
        await supabase.from("whatsapp_contact_status").insert({ tenant_id: tenantId, contact_id: selectedContact.id, status: "attending", assigned_to: user.id });
      }
      setSelectedContact((prev: any) => ({ ...prev, contact_status: { ...(prev?.contact_status || {}), status: "attending", assigned_to: user.id } }));
      loadContacts();
    }
  };

  const handleSaveSettings = async (newSettings: any) => {
    if (!tenantId) return;
    setSavingSettings(true);
    try {
      const payload = { ...newSettings, tenant_id: tenantId };
      delete payload.id; delete payload.created_at; delete payload.updated_at;
      if (settings?.id) { await supabase.from("whatsapp_settings").update(payload).eq("id", settings.id); }
      else { await supabase.from("whatsapp_settings").insert(payload); }
      setSettings({ ...settings, ...newSettings });
      setShowSettings(false);
      toast({ title: "Configurações salvas!" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setSavingSettings(false); }
  };

  const handleDeleteSession = async (id: string) => {
    const session = sessions.find((s) => s.id === id);
    if (session?.connection_type === "meta") {
      const { error } = await supabase.functions.invoke(`whatsapp-meta-connections/${id}`, { method: "DELETE" });
      if (error) throw error;
    } else {
      // Limpar dados dependentes primeiro (sem FK cascade)
      const { data: contacts } = await supabase.from("whatsapp_contacts").select("id").eq("session_id", id);
      const contactIds = (contacts || []).map((c) => c.id);
      if (contactIds.length > 0) {
        await supabase.from("whatsapp_messages").delete().in("contact_id", contactIds);
        await supabase.from("whatsapp_contact_tags").delete().in("contact_id", contactIds);
        await supabase.from("whatsapp_contact_status").delete().in("contact_id", contactIds);
      }
      await supabase.from("whatsapp_messages").delete().eq("session_id", id);
      await supabase.from("whatsapp_contacts").delete().eq("session_id", id);
      const { error } = await supabase.from("whatsapp_sessions").delete().eq("id", id);
      if (error) throw error;
    }
    if (selectedSessionId === id) { setSelectedSessionId(undefined); setSelectedContact(null); }
    await loadSessions();
  };

  const handleDeleteChat = async () => {
    if (!selectedContact) return;
    await supabase.from("whatsapp_messages").delete().eq("contact_id", selectedContact.id);
    await supabase.from("whatsapp_contact_tags").delete().eq("contact_id", selectedContact.id);
    await supabase.from("whatsapp_contact_status").delete().eq("contact_id", selectedContact.id);
    await supabase.from("whatsapp_contacts").delete().eq("id", selectedContact.id);
    setSelectedContact(null); setMessages([]); loadContacts();
    toast({ title: "Conversa apagada!" });
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedContact || !tenantId) return;
    const { data: existing } = await supabase.from("whatsapp_contact_status").select("id").eq("contact_id", selectedContact.id).single();
    if (existing) { await supabase.from("whatsapp_contact_status").update({ status: newStatus, last_status_change: new Date().toISOString() }).eq("id", existing.id); }
    else { await supabase.from("whatsapp_contact_status").insert({ tenant_id: tenantId, contact_id: selectedContact.id, status: newStatus }); }
    setSelectedContact((prev: any) => ({ ...prev, contact_status: { ...(prev?.contact_status || {}), status: newStatus } }));
    loadContacts();
  };

  const selectedSession = sessions.find((s) => s.id === selectedSessionId);
  const isMetaSession = selectedSession?.connection_type === "meta";

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
            onNewMetaSession={() => { setEditingMetaConnection(null); setShowMetaModal(true); }}
            onConnect={handleConnect}
            onDelete={handleDeleteSession}
            onEditMeta={(session) => { setEditingMetaConnection(session); setShowMetaModal(true); }}
            onRefresh={loadSessions}
            onCheckStatus={handleCheckStatus}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={25} minSize={15}>
          <WhatsAppContactList contacts={contacts} selectedId={selectedContact?.id} onSelect={(c) => setSelectedContact(c)} profilesMap={profilesMap} />
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
            onSendMedia={handleSendMedia}
            onStatusChange={handleStatusChange}
            onOpenTags={() => setShowTagManager(true)}
            onDeleteChat={handleDeleteChat}
            onTransfer={() => setShowTransfer(true)}
            sending={sending}
          />
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Nova Sessão Evolution */}
      <Dialog open={showNewSession} onOpenChange={setShowNewSession}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Nova Sessão WhatsApp</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da sessão</Label>
              <Input value={newSessionName} onChange={(e) => setNewSessionName(e.target.value)} placeholder="Ex: Vendas, Suporte..." onKeyDown={(e) => e.key === "Enter" && handleCreateSession()} />
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

      <WhatsAppQRDialog open={showQR} onOpenChange={setShowQR} qrCode={qrSession?.qr_code} sessionName={qrSession?.session_name} status={qrSession?.status} />
      <WhatsAppSettingsDialog open={showSettings} onOpenChange={setShowSettings} settings={settings} onSave={handleSaveSettings} saving={savingSettings} />

      {/* Modal Meta API */}
      <MetaConnectionModal
        open={showMetaModal}
        onOpenChange={setShowMetaModal}
        onSuccess={() => { setShowMetaModal(false); loadSessions(); }}
        editingConnection={editingMetaConnection}
      />

      {selectedContact && tenantId && (
        <WhatsAppTagManager open={showTagManager} onOpenChange={setShowTagManager} contactId={selectedContact.id} tenantId={tenantId} tags={selectedContact.tags || []}
          onTagsChanged={() => {
            loadContacts();
            supabase.from("whatsapp_contact_tags").select("*").eq("contact_id", selectedContact.id).then(({ data }) => { if (data) setSelectedContact((prev: any) => ({ ...prev, tags: data })); });
          }}
        />
      )}

      {selectedContact && tenantId && user && (
        <TransferConversationModal open={showTransfer} onOpenChange={setShowTransfer} contactId={selectedContact.id} contactName={selectedContact.display_name} tenantId={tenantId} currentUserId={user.id}
          onTransferred={() => { loadContacts(); setSelectedContact(null); setMessages([]); }}
        />
      )}
    </div>
  );
}
