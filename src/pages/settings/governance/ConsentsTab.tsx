import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function ConsentsTab() {
  const { data } = useQuery({
    queryKey: ["data-consents"],
    queryFn: async () => (await supabase.from("data_consents").select("*").order("created_at", { ascending: false }).limit(200)).data ?? [],
  });

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-muted/30 text-sm">
        Registros de consentimento de titulares (clientes, contatos, leads, respostas de formulário, WhatsApp, campanhas e cadências). Campanhas e mensagens devem respeitar o status de consentimento, origem do dado e opt-out.
      </Card>
      <Card>
        {(data?.length ?? 0) === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Nenhum consentimento registrado.</div>
        ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Titular</TableHead><TableHead>Canal</TableHead><TableHead>Status</TableHead><TableHead>Base legal</TableHead><TableHead>Origem</TableHead><TableHead>Concedido em</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data!.map((c) => (
                <TableRow key={c.id}>
                  <TableCell><div className="font-medium">{c.subject_label ?? c.subject_id}</div><div className="text-xs text-muted-foreground">{c.subject_type}</div></TableCell>
                  <TableCell>{c.channel}</TableCell>
                  <TableCell><Badge variant={c.consent_status === "granted" ? "default" : c.consent_status === "revoked" ? "destructive" : "secondary"}>{c.consent_status}</Badge></TableCell>
                  <TableCell>{c.legal_basis ?? "—"}</TableCell>
                  <TableCell>{c.data_origin ?? "—"}</TableCell>
                  <TableCell>{c.given_at ? new Date(c.given_at).toLocaleString("pt-BR") : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
