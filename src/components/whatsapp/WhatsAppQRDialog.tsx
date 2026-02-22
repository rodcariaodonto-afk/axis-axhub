import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, QrCode } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  qrCode?: string | null;
  sessionName?: string;
  status?: string;
}

export function WhatsAppQRDialog({ open, onOpenChange, qrCode, sessionName, status }: Props) {
  const isConnected = status === "connected";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            {isConnected ? "Conectado!" : `Conectar ${sessionName || "Sessão"}`}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center py-6">
          {isConnected ? (
            <div className="text-center space-y-2">
              <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                <QrCode className="h-8 w-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Sessão conectada com sucesso!</p>
            </div>
          ) : qrCode ? (
            <div className="space-y-4 text-center">
              <img
                src={qrCode.startsWith("data:") ? qrCode : `data:image/png;base64,${qrCode}`}
                alt="QR Code WhatsApp"
                className="w-64 h-64 mx-auto rounded-lg"
              />
              <p className="text-sm text-muted-foreground">
                Abra o WhatsApp no celular e escaneie o QR Code
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
