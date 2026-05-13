import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Download, Loader2, ExternalLink } from "lucide-react";

export default function ExportsTab() {
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);

  const { data: exports } = useQuery({
    queryKey: ["data-exports"],
    queryFn: async () => {
      const { data } = await supabase.from("data_exports").select("*").order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  const runExport = useMutation({
    mutationFn: async () => {
      setRunning(true);
      const { data, error } = await supabase.functions.invoke("governance-export", { body: {} });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Exportação concluída", description: "Arquivo JSON disponível para download." });
      qc.invalidateQueries({ queryKey: ["data-exports"] });
    },
    onError: (e: Error) => toast({ title: "Falha na exportação", description: e.message, variant: "destructive" }),
    onSettled: () => setRunning(false),
  });

  return (
    <div className="space-y-4">
      <Card className="p-4 flex items-center justify-between">
        <div>
          <p className="font-medium">Nova exportação completa</p>
          <p className="text-sm text-muted-foreground">Gera um JSON seguro com todos os dados da sua conta. Anexos e mídias não são incluídos — apenas referências.</p>
        </div>
        <Button onClick={() => runExport.mutate()} disabled={running}>
          {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
          Exportar agora
        </Button>
      </Card>

      <Card>
        {(exports?.length ?? 0) === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Nenhuma exportação ainda.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Solicitada em</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tamanho</TableHead>
                <TableHead>Expira em</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exports!.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{new Date(e.created_at).toLocaleString("pt-BR")}</TableCell>
                  <TableCell><Badge variant={e.status === "completed" ? "default" : "secondary"}>{e.status}</Badge></TableCell>
                  <TableCell>{e.file_size_bytes ? `${(e.file_size_bytes / 1024).toFixed(1)} KB` : "—"}</TableCell>
                  <TableCell>{e.expires_at ? new Date(e.expires_at).toLocaleString("pt-BR") : "—"}</TableCell>
                  <TableCell className="text-right">
                    {e.file_url && new Date(e.expires_at) > new Date() ? (
                      <Button asChild size="sm" variant="outline">
                        <a href={e.file_url} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5 mr-1.5" />Baixar</a>
                      </Button>
                    ) : <span className="text-xs text-muted-foreground">Indisponível</span>}
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
