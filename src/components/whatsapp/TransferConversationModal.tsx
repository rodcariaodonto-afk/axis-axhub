import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactName?: string;
  tenantId: string;
  currentUserId: string;
  onTransferred: () => void;
}

interface Profile {
  id: string;
  full_name: string | null;
}

interface Queue {
  id: string;
  name: string;
  description: string | null;
}

export function TransferConversationModal({
  open,
  onOpenChange,
  contactId,
  contactName,
  tenantId,
  currentUserId,
  onTransferred,
}: Props) {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedQueueId, setSelectedQueueId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [tab, setTab] = useState("user");

  useEffect(() => {
    if (!open || !tenantId) return;
    // Load profiles (exclude current user)
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("tenant_id", tenantId)
      .neq("id", currentUserId)
      .then(({ data }) => {
        if (data) setProfiles(data);
      });
    // Load queues
    supabase
      .from("whatsapp_queues")
      .select("id, name, description")
      .eq("tenant_id", tenantId)
      .then(({ data }) => {
        if (data) setQueues(data as Queue[]);
      });
  }, [open, tenantId, currentUserId]);

  const handleTransfer = async () => {
    const toUser = tab === "user" ? selectedUserId : undefined;
    const toQueue = tab === "queue" ? selectedQueueId : undefined;
    if (!toUser && !toQueue) return;

    setTransferring(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "transfer-whatsapp-conversation",
        {
          body: {
            contact_id: contactId,
            to_user_id: toUser || null,
            to_queue_id: toQueue || null,
            reason: reason.trim() || null,
          },
        }
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Conversa transferida com sucesso!" });
      onOpenChange(false);
      onTransferred();
    } catch (err: any) {
      toast({
        title: "Erro ao transferir",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setTransferring(false);
    }
  };

  const canTransfer =
    (tab === "user" && selectedUserId) || (tab === "queue" && selectedQueueId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transferir Conversa</DialogTitle>
          <DialogDescription>
            Transferir a conversa de{" "}
            <span className="font-medium">{contactName || "contato"}</span> para
            outro atendente ou fila.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="user" className="flex-1 gap-1">
              <User className="h-3.5 w-3.5" />
              Usuário
            </TabsTrigger>
            <TabsTrigger value="queue" className="flex-1 gap-1">
              <Users className="h-3.5 w-3.5" />
              Fila
            </TabsTrigger>
          </TabsList>

          <TabsContent value="user" className="mt-3">
            <ScrollArea className="h-48">
              <RadioGroup
                value={selectedUserId}
                onValueChange={setSelectedUserId}
                className="space-y-1"
              >
                {profiles.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 rounded-md border border-border p-2 hover:bg-accent cursor-pointer"
                    onClick={() => setSelectedUserId(p.id)}
                  >
                    <RadioGroupItem value={p.id} id={`user-${p.id}`} />
                    <Label htmlFor={`user-${p.id}`} className="cursor-pointer flex-1">
                      {p.full_name || "Sem nome"}
                    </Label>
                  </div>
                ))}
                {profiles.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum outro usuário encontrado
                  </p>
                )}
              </RadioGroup>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="queue" className="mt-3">
            <ScrollArea className="h-48">
              <RadioGroup
                value={selectedQueueId}
                onValueChange={setSelectedQueueId}
                className="space-y-1"
              >
                {queues.map((q) => (
                  <div
                    key={q.id}
                    className="flex items-center gap-2 rounded-md border border-border p-2 hover:bg-accent cursor-pointer"
                    onClick={() => setSelectedQueueId(q.id)}
                  >
                    <RadioGroupItem value={q.id} id={`queue-${q.id}`} />
                    <Label htmlFor={`queue-${q.id}`} className="cursor-pointer flex-1">
                      <span>{q.name}</span>
                      {q.description && (
                        <span className="text-xs text-muted-foreground ml-2">
                          {q.description}
                        </span>
                      )}
                    </Label>
                  </div>
                ))}
                {queues.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma fila criada
                  </p>
                )}
              </RadioGroup>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="space-y-2">
          <Label>Motivo (opcional)</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: Cliente solicitou atendimento técnico..."
            rows={2}
            className="resize-none"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleTransfer} disabled={!canTransfer || transferring}>
            {transferring ? "Transferindo..." : "Transferir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
