import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { NotificationProvider } from "@/components/notifications/NotificationProvider";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <NotificationProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <main className="flex-1 flex flex-col">
            <header className="h-14 flex items-center gap-2 border-b border-border px-4 bg-card/50">
              <SidebarTrigger className="mr-2" />
              <div className="flex-1" />
              <ThemeToggle />
              <NotificationBell />
            </header>
            <div className="flex-1 p-6 overflow-auto">
              {children}
            </div>
          </main>
        </div>
      </SidebarProvider>
    </NotificationProvider>
  );
}

