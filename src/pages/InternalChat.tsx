import { useState, useCallback } from "react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { InternalChatSidebar, type Conversation } from "@/components/internal-chat/InternalChatSidebar";
import { InternalChatWindow } from "@/components/internal-chat/InternalChatWindow";
import { NewConversationModal } from "@/components/internal-chat/NewConversationModal";

export default function InternalChat() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newConvOpen, setNewConvOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refresh = useCallback(() => setRefreshTrigger((p) => p + 1), []);

  const handleConversationCreated = (convId: string) => {
    refresh();
    // Select the newly created conversation after refresh
    setTimeout(() => {
      setRefreshTrigger((p) => p + 1);
    }, 500);
  };

  return (
    <div className="h-[calc(100vh-6rem)] rounded-lg border border-border overflow-hidden">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
          <InternalChatSidebar
            selectedId={selectedConversation?.id || null}
            onSelect={setSelectedConversation}
            onNewConversation={() => setNewConvOpen(true)}
            refreshTrigger={refreshTrigger}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={70}>
          <InternalChatWindow
            conversation={selectedConversation}
            onMessageSent={refresh}
          />
        </ResizablePanel>
      </ResizablePanelGroup>

      <NewConversationModal
        open={newConvOpen}
        onOpenChange={setNewConvOpen}
        onCreated={handleConversationCreated}
      />
    </div>
  );
}
