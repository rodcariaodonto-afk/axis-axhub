import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  full_name: string;
  email: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (conversationId: string) => void;
}

export function NewConversationModal({ open, onOpenChange, onCreated }: Props) {
  const { user } = useAuth();
  const [type, setType] = useState<"direct" | "group">("direct");
  const [groupName, setGroupName] = useState("");
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open || !user) return;
    const fetchUsers = async () => {
      const { data: profile } = await supabase.from("profiles").select("tenant_id").single();
      if (!profile) return;
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("tenant_id", profile.tenant_id)
        .neq("id", user.id)
        .order("full_name");
      setUsers(data || []);
    };
    fetchUsers();
    setSelectedUsers([]);
    setGroupName("");
    setType("direct");
  }, [open, user]);

  const toggleUser = (id: string) => {
    if (type === "direct") {
      setSelectedUsers([id]);
    } else {
      setSelectedUsers((prev) =>
        prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]
      );
    }
  };

  const handleCreate = async () => {
    if (!user || selectedUsers.length === 0) return;
    if (type === "group" && !groupName.trim()) {
      toast({ title: "Informe o nome do grupo", variant: "destructive" });
      return;
    }
    setCreating(true);

    const { data: profile } = await supabase.from("profiles").select("tenant_id").single();
    if (!profile) { setCreating(false); return; }

    // For direct: check if conversation already exists
    if (type === "direct") {
      const otherUserId = selectedUsers[0];
      const { data: myConvs } = await supabase
        .from("internal_conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      if (myConvs && myConvs.length > 0) {
        const { data: otherConvs } = await supabase
          .from("internal_conversation_participants")
          .select("conversation_id")
          .eq("user_id", otherUserId)
          .in("conversation_id", myConvs.map((c) => c.conversation_id));

        if (otherConvs && otherConvs.length > 0) {
          // Check if any is direct
          const { data: existing } = await supabase
            .from("internal_conversations")
            .select("id")
            .in("id", otherConvs.map((c) => c.conversation_id))
            .eq("type", "direct")
            .limit(1);

          if (existing && existing.length > 0) {
            setCreating(false);
            onOpenChange(false);
            onCreated(existing[0].id);
            return;
          }
        }
      }
    }

    const { data: conv, error } = await supabase
      .from("internal_conversations")
      .insert({
        tenant_id: profile.tenant_id,
        type,
        name: type === "group" ? groupName.trim() : null,
      })
      .select()
      .single();

    if (error || !conv) {
      toast({ title: "Erro ao criar conversa", description: error?.message, variant: "destructive" });
      setCreating(false);
      return;
    }

    // Add participants (including self)
    const participants = [user.id, ...selectedUsers].map((uid) => ({
      conversation_id: conv.id,
      user_id: uid,
      tenant_id: profile.tenant_id,
    }));

    await supabase.from("internal_conversation_participants").insert(participants);

    setCreating(false);
    onOpenChange(false);
    onCreated(conv.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader><DialogTitle>Nova Conversa</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v) => { setType(v as any); setSelectedUsers([]); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="direct">Direta</SelectItem>
                <SelectItem value="group">Grupo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === "group" && (
            <div className="space-y-2">
              <Label>Nome do Grupo</Label>
              <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Ex: Equipe de Vendas" />
            </div>
          )}

          <div className="space-y-2">
            <Label>{type === "direct" ? "Selecione o usuário" : "Selecione os participantes"}</Label>
            <ScrollArea className="max-h-[200px] border border-border rounded-md">
              {users.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum usuário disponível</p>
              ) : (
                users.map((u) => (
                  <label
                    key={u.id}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedUsers.includes(u.id)}
                      onCheckedChange={() => toggleUser(u.id)}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{u.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                  </label>
                ))
              )}
            </ScrollArea>
          </div>

          <Button onClick={handleCreate} disabled={creating || selectedUsers.length === 0} className="w-full">
            {creating ? "Criando..." : "Criar Conversa"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
