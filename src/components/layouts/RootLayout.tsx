import { Outlet } from "@tanstack/react-router";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Toaster } from "sonner";
import { useDarkMode } from "@/hooks/useDarkMode";
import { AppSidebar } from "./AppSidebar";
import omgpeets from "../../assets/fatcat/omgpeets.png";

const BANNER_CATS: { deg: number; y: number }[] = [
  { deg: -35, y: 2 },
  { deg: 48, y: -2 },
  { deg: -20, y: 3 },
  { deg: 62, y: -1 },
  { deg: -50, y: 2 },
  { deg: 25, y: -3 },
  { deg: -70, y: 1 },
  { deg: 40, y: 2 },
  { deg: -15, y: -2 },
  { deg: 55, y: 3 },
  { deg: -42, y: -1 },
  { deg: 18, y: 2 },
  { deg: -60, y: -2 },
  { deg: 33, y: 1 },
  { deg: -28, y: 3 },
  { deg: 75, y: -2 },
  { deg: -45, y: 1 },
  { deg: 22, y: -3 },
  { deg: -65, y: 2 },
  { deg: 28, y: -1 },
  { deg: -38, y: -1 },
  { deg: -38, y: -1 },
  { deg: 58, y: -1 },
  { deg: 38, y: -1 },
  { deg: 98, y: -1 },
  { deg: -38, y: -1 },
  { deg: 8, y: -1 },
  { deg: 38, y: -1 },
] as const;

export function RootLayout() {
  const { isDark } = useDarkMode();
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0 overflow-x-hidden">
        <header className="relative flex h-12 items-center border-b overflow-hidden bg-sidebar/30">
          <div className="absolute inset-0 flex items-center justify-around pointer-events-none select-none px-8">
            {BANNER_CATS.map((cat, i) => (
              <img
                key={i}
                src={omgpeets}
                alt=""
                className="h-9 w-9 object-contain shrink-0"
                style={{
                  transform: `rotate(${cat.deg}deg) translateY(${cat.y}px)`,
                }}
              />
            ))}
          </div>
          <div className="relative z-10 px-2">
            <SidebarTrigger />
          </div>
        </header>
        <main className="min-w-0 flex-1 overflow-x-hidden px-6 py-8">
          <Outlet />
        </main>
        <Toaster richColors position="bottom-right" theme={isDark ? "dark" : "light"} />
        <footer className="border-t">
          <div className="px-6 py-6 text-center text-sm text-muted-foreground">
            © 2026 Fat Cat Cartel · chow is an amazing sage ·{" "}
            <a
              href="http://discord.gg/TDdhZgQyCR"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-foreground transition-colors"
            >
              Discord
            </a>
          </div>
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}
