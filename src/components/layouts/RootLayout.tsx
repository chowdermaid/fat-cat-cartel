import { useState } from "react";
import { Link, Outlet } from "@tanstack/react-router";
import { Menu, Moon, Sun, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDarkMode } from "@/hooks/useDarkMode";
import fatcathi from "../../assets/fatcathi.png";

const navLinkClass =
  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground text-muted-foreground [&.active]:text-foreground [&.active]:bg-accent/50";

const mobileNavLinkClass =
  "block px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground text-muted-foreground [&.active]:text-foreground [&.active]:bg-accent/50";

export function RootLayout() {
  const { isDark, toggle } = useDarkMode();
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

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
            <Link to="/jointhemeowfia" className={navLinkClass}>
              Join
            </Link>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            <Link to="/" className={navLinkClass}>
              Home
            </Link>
            <Link to="/pastevents" className={navLinkClass}>
              Past Events
            </Link>
            <Link to="/fc-collection" className={navLinkClass}>
              FC Collection
            </Link>
            <Link to="/mount-roulette" className={navLinkClass}>
              Mount Roulette
            </Link>
            <Link to="/raid-stats" className={navLinkClass}>
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

          {/* Mobile controls */}
          <div className="flex items-center gap-1 md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              {menuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="md:hidden border-t bg-background/95 backdrop-blur px-4 py-3 space-y-1">
            <Link to="/" onClick={closeMenu} className={mobileNavLinkClass}>
              Home
            </Link>
            <Link
              to="/pastevents"
              onClick={closeMenu}
              className={mobileNavLinkClass}
            >
              Past Events
            </Link>
            <Link
              to="/fc-collection"
              onClick={closeMenu}
              className={mobileNavLinkClass}
            >
              FC Collection
            </Link>
            <Link
              to="/mount-roulette"
              onClick={closeMenu}
              className={mobileNavLinkClass}
            >
              Mount Roulette
            </Link>
            <Link
              to="/raid-stats"
              onClick={closeMenu}
              className={mobileNavLinkClass}
            >
              Raid Stats
            </Link>
            <Link
              to="/admin"
              onClick={closeMenu}
              className="block px-3 py-2 rounded-md text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground text-muted-foreground/60 [&.active]:text-foreground"
            >
              Admin
            </Link>
          </div>
        )}
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
