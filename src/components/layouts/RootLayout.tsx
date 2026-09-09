import { Outlet } from "@tanstack/react-router";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Toaster } from "sonner";
import { DevPersonaControl } from "@/components/dev/DevPersonaControl";
import { useDarkMode } from "@/hooks/useDarkMode";
import { AppSidebar } from "./AppSidebar";
export function RootLayout() {
  const { isDark } = useDarkMode();
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0 overflow-x-hidden">
        <header className="relative flex h-12 items-center border-b border-sidebar-border bg-sidebar text-sidebar-foreground">
          <div className="relative z-10 px-2">
            <SidebarTrigger />
          </div>
          <DevPersonaControl />
        </header>
        <main className="min-w-0 flex-1 overflow-x-hidden px-6 py-8">
          <Outlet />
        </main>
        <Toaster richColors position="bottom-right" theme={isDark ? "dark" : "light"} />
      </SidebarInset>
    </SidebarProvider>
  );
}
