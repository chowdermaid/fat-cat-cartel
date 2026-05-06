import { Link, Outlet } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDarkMode } from "@/hooks/useDarkMode";
import fatcathi from "../../assets/fatcathi.png";

export function RootLayout() {
  const { isDark, toggle } = useDarkMode();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-2 font-bold text-lg font-serif"
            >
              <img
                src={fatcathi}
                className="w-5 h-5 rounded-full"
                alt="Fat Cat Cartel"
              />
              Fat Cat Cartel
            </Link>
            <Link
              to="/jointhemeowfia"
              className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground text-muted-foreground [&.active]:text-foreground [&.active]:bg-accent/50"
            >
              Join
            </Link>
          </div>

          <nav className="flex items-center gap-1">
            <Link
              to="/"
              className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground text-muted-foreground [&.active]:text-foreground [&.active]:bg-accent/50"
            >
              Home
            </Link>
            <Link
              to="/pastevents"
              className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground text-muted-foreground [&.active]:text-foreground [&.active]:bg-accent/50"
            >
              Past Events
            </Link>
            <Link
              to="/fc-collection"
              className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground text-muted-foreground [&.active]:text-foreground [&.active]:bg-accent/50"
            >
              FC Collection
            </Link>
            <Link
              to="/raid-stats"
              className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground text-muted-foreground [&.active]:text-foreground [&.active]:bg-accent/50"
            >
              Raid Stats
            </Link>
            <Link
              to="/admin"
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground text-muted-foreground/60 [&.active]:text-foreground"
            >
              Admin
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              className="ml-2"
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-screen-2xl px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t mt-16">
        <div className="mx-auto max-w-screen-2xl px-4 py-6 text-center text-sm text-muted-foreground">
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
    </div>
  );
}
