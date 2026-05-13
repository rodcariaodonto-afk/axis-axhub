import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { getUserTenantId } from "@/lib/getUserTenantId";

const TYPES = [
  { v: "access", l: "Acesso aos dados" },
  { v: "correction", l: "Correção" },
  { v: "portability", l: "Portabilidade" },
  { v: "anonymization", l: "Anonimização" },
  { v: "deletion", l: "Exclusão" },
  { v: "objection", l: "Oposição" },
  { v: "consent_revocation", l: "Revogação de consentimento" },
];

export default function SubjectRequestsTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ requester_name: "", requester_email: "", request_type: "access", priority: "medium", description: "" });

  const { data } = useQuery({
    queryKey: ["dsr"],
    queryFn: async () => (await supabase.from("data_subject_requests").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const create = useMutation({
    mutationFn: async () => {
      const tenantId = await getUserTenantId();
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("data_subject_requests").insert({
        tenant_id: tenantId!,
        ...form,
        created_by: user?.id,
        due_at: new Date(Date.now() + 15 * 86400_000).toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: "Pedido registrado" }); qc.invalidateQueries({ queryKey: ["dsr"] }); setOpen(false); },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("data_subject_requests").update({ status, resolved_at: status === "resolved" ? new Date().toISOString() : null }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["dsr"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1.5" />Novo pedido</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo pedido do titular</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Nome do titular" value={form.requester_name} onChange={(e) => setForm({ ...form, requester_name: e.target.value })} />
              <Input type="email" placeholder="E-mail" value={form.requester_email} onChange={(e) => setForm({ ...form, requester_email: e.target.value })} />
              <Select value={form.request_type} onValueChange={(v) => setForm({ ...form, request_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map(t => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
              <Textarea placeholder="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <DialogFooter><Button onClick={() => create.mutate()}>Registrar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        {(data?.length ?? 0) === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Nenhum pedido registrado.</div>
        ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Titular</TableHead><TableHead>Tipo</TableHead><TableHead>Prioridade</TableHead><TableHead>Status</TableHead><TableHead>Prazo</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data!.map((r) => (
                <TableRow key={r.id}>
                  <TableCell><div className="font-medium">{r.requester_name}</div><div className="text-xs text-muted-foreground">{r.requester_email}</div></TableCell>
                  <TableCell>{TYPES.find(t => t.v === r.request_type)?.l ?? r.request_type}</TableCell>
                  <TableCell><Badge variant="outline">{r.priority}</Badge></TableCell>
                  <TableCell><Badge variant={r.status === "resolved" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
                  <TableCell>{r.due_at ? new Date(r.due_at).toLocaleDateString("pt-BR") : "—"}</TableCell>
                  <TableCell className="text-right">
                    {r.status !== "resolved" && <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "resolved")}>Resolver</Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
