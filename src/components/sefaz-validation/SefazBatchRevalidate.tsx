import { useState } from "react";
import { RefreshCw, CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { SefazStatus } from "./SefazValidationBadge";

interface NFRow {
  id: string;
  nf_number: string;
  pj_name: string | null;
  sefaz_status: SefazStatus;
}

interface Props {
  nfs: NFRow[];
}

export function SefazBatchRevalidate({ nfs }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const queryClient = useQueryClient();

  const revalidatable = nfs.filter(
    (nf) => nf.sefaz_status === "sefaz_indisponivel" || nf.sefaz_status === "nao_verificado",
  );

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === revalidatable.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(revalidatable.map((nf) => nf.id)));
    }
  }

  async function handleBatchRevalidate() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;

    setRunning(true);
    setProgress({ done: 0, total: ids.length });

    let done = 0;
    let successCount = 0;
    let failCount = 0;

    for (const id of ids) {
      try {
        const { data } = await supabase.functions.invoke("validate-nf-sefaz", {
          body: { nf_approval_id: id },
        });
        const status: string = (data as any)?.status ?? "";
        if (status === "validado_sefaz") successCount++;
        else failCount++;
      } catch {
        failCount++;
      }
      done++;
      setProgress({ done, total: ids.length });
    }

    await queryClient.invalidateQueries({ queryKey: ["nf-approvals"] });
    toast.success(
      `Revalidação concluída: ${successCount} válida(s), ${failCount} com problema(s)`,
    );

    setRunning(false);
    setProgress(null);
    setSelected(new Set());
  }

  if (revalidatable.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma NF elegível para revalidação (somente "indisponível" ou "não verificado").
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={toggleAll} disabled={running} className="gap-1.5 text-xs">
          {selected.size === revalidatable.length ? (
            <CheckSquare className="h-3.5 w-3.5" />
          ) : (
            <Square className="h-3.5 w-3.5" />
          )}
          {selected.size === revalidatable.length ? "Desmarcar todas" : "Selecionar todas"}
        </Button>

        <Button
          size="sm"
          disabled={selected.size === 0 || running}
          onClick={handleBatchRevalidate}
          className="gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${running ? "animate-spin" : ""}`} />
          {running && progress
            ? `Revalidando ${progress.done}/${progress.total}...`
            : `Revalidar ${selected.size} selecionada(s)`}
        </Button>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-muted-foreground text-xs">
              <th className="px-3 py-2 w-8" />
              <th className="text-left px-3 py-2 font-medium">PJ</th>
              <th className="text-left px-3 py-2 font-medium">Número</th>
              <th className="text-left px-3 py-2 font-medium">Status SEFAZ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {revalidatable.map((nf) => (
              <tr
                key={nf.id}
                className="hover:bg-muted/20 cursor-pointer"
                onClick={() => !running && toggleSelect(nf.id)}
              >
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(nf.id)}
                    onChange={() => toggleSelect(nf.id)}
                    disabled={running}
                    className="accent-primary"
                  />
                </td>
                <td className="px-3 py-2 font-medium">{nf.pj_name ?? "—"}</td>
                <td className="px-3 py-2 font-mono">{nf.nf_number}</td>
                <td className="px-3 py-2 text-muted-foreground">{nf.sefaz_status ?? "nao_verificado"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
