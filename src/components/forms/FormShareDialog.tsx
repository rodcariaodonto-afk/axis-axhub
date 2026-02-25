import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Copy, Mail, MessageCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uniqueCode: string;
}

export function FormShareDialog({ open, onOpenChange, uniqueCode }: Props) {
  const baseUrl = window.location.origin;
  const formUrl = `${baseUrl}/form/${uniqueCode}`;

  const copy = () => {
    navigator.clipboard.writeText(formUrl);
    toast({ title: "Link copiado!" });
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`Preencha nosso formulário: ${formUrl}`)}`, "_blank");
  };

  const shareEmail = () => {
    window.open(`mailto:?subject=${encodeURIComponent("Formulário para preenchimento")}&body=${encodeURIComponent(`Olá,\n\nPor favor, preencha nosso formulário:\n${formUrl}\n\nObrigado!`)}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader><DialogTitle>Compartilhar Formulário</DialogTitle></DialogHeader>
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Link público do formulário:</p>
            <div className="flex gap-2">
              <Input value={formUrl} readOnly className="text-xs" />
              <Button variant="outline" size="icon" onClick={copy}><Copy className="h-4 w-4" /></Button>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="p-4 bg-white rounded-lg">
              <QRCodeSVG value={formUrl} size={180} />
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={shareWhatsApp}>
              <MessageCircle className="mr-2 h-4 w-4" />WhatsApp
            </Button>
            <Button variant="outline" className="flex-1" onClick={shareEmail}>
              <Mail className="mr-2 h-4 w-4" />Email
            </Button>
            <Button variant="outline" className="flex-1" onClick={copy}>
              <Copy className="mr-2 h-4 w-4" />Copiar Link
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
