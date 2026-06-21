import { useRef } from "react";
import { Paperclip, ExternalLink, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUploadComprovante, type RepasseAdmin } from "@/hooks/useRepasseAdmin";
import { toast } from "sonner";

const ACCEPTED = ["application/pdf", "image/jpeg", "image/png"];
const MAX_BYTES = 10 * 1024 * 1024;

interface Props {
  repasse: RepasseAdmin;
}

export function RepasseComprovante({ repasse }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadComprovante();

  async function handleFile(file: File) {
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Formato inválido. Use PDF, JPEG ou PNG.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Arquivo excede 10 MB.");
      return;
    }
    try {
      await upload.mutateAsync({ repasse, file });
      toast.success("Comprovante enviado e repasse marcado como pago");
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao enviar comprovante");
    }
  }

  if (repasse.comprovante_url) {
    return (
      <a
        href={repasse.comprovante_url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <ExternalLink className="h-3 w-3" />
        Ver comprovante
      </a>
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs gap-1"
        disabled={upload.isPending}
        onClick={() => inputRef.current?.click()}
      >
        <Paperclip className="h-3 w-3" />
        {upload.isPending ? "Enviando..." : "Anexar"}
      </Button>
    </>
  );
}
