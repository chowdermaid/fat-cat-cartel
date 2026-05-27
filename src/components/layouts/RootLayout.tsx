import { Outlet } from "@tanstack/react-router";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Toaster } from "sonner";
import { useDarkMode } from "@/hooks/useDarkMode";
import { AppSidebar } from "./AppSidebar";
import fatCatOutline from "@/assets/fatcat/fatcatoutline.svg";

const BANNER_CATS = [
  { rotate: -18, y: 1 },
  { rotate: 15, y: -2 },
  { rotate: -10, y: 2 },
  { rotate: 21, y: -1 },
  { rotate: -16, y: 1 },
  { rotate: 12, y: -2 },
  { rotate: -23, y: 2 },
  { rotate: 9, y: -1 },
  { rotate: -13, y: 1 },
  { rotate: 18, y: -2 },
  { rotate: -9, y: 2 },
  { rotate: 14, y: -1 },
  { rotate: -20, y: 1 },
  { rotate: 11, y: -2 },
  { rotate: -15, y: 2 },
  { rotate: 23, y: -1 },
  { rotate: -12, y: 1 },
  { rotate: 16, y: -2 },
  { rotate: -22, y: 2 },
  { rotate: 10, y: -1 },
  { rotate: -17, y: 1 },
  { rotate: 19, y: -2 },
] as const;

function FatCatBanner() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-around gap-6 px-14 opacity-70 select-none">
      {BANNER_CATS.map((cat, index) => (
        <img
          key={index}
          src={fatCatOutline}
          alt=""
          aria-hidden="true"
          className="h-10 w-16 max-w-none shrink-0 object-contain opacity-70 dark:invert"
          style={{
            transform: `rotate(${cat.rotate}deg) translateY(${cat.y}px)`,
          }}
        />
      ))}
    </div>
  );
}

export function RootLayout() {
  const { isDark } = useDarkMode();
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0 overflow-x-hidden">
        <header className="relative flex h-12 items-center border-b overflow-hidden bg-sidebar/30">
          <FatCatBanner />
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
