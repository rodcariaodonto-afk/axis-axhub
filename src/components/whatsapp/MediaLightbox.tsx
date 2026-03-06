import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  type: "image" | "video";
}

export function MediaLightbox({ open, onOpenChange, url, type }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] p-2 flex flex-col items-center justify-center">
        {type === "image" ? (
          <img src={url} alt="Mídia" className="max-w-full max-h-[80vh] object-contain rounded" />
        ) : (
          <video src={url} controls autoPlay className="max-w-full max-h-[80vh] rounded" />
        )}
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 gap-1 text-xs text-muted-foreground"
          onClick={() => window.open(url, "_blank")}
        >
          <ExternalLink className="h-3 w-3" />
          Abrir em nova aba
        </Button>
      </DialogContent>
    </Dialog>
  );
}
