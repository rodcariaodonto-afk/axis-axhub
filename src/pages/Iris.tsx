import { useState } from "react";
import { Sparkles } from "lucide-react";

export default function Iris() {
  const [loading, setLoading] = useState(true);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-background">
        <Sparkles className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold">Íris AXholding</h1>
      </div>
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
            <div className="flex flex-col items-center gap-3">
              <Sparkles className="h-8 w-8 text-primary animate-pulse" />
              <span className="text-sm text-muted-foreground">Carregando Íris…</span>
            </div>
          </div>
        )}
        <iframe
          src="https://iris-axholding.lovable.app"
          className="w-full h-full border-0"
          allow="camera; microphone; clipboard-write; clipboard-read"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
          onLoad={() => setLoading(false)}
          title="Íris AXholding"
        />
      </div>
    </div>
  );
}
