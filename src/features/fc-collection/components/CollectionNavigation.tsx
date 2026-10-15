import { Link } from "@tanstack/react-router";
import { LayoutDashboard, Library, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollectionNavigationProps {
  active: "overview" | "collections" | "rankings";
}

export function CollectionNavigation({ active }: CollectionNavigationProps) {
  const linkClass = (view: CollectionNavigationProps["active"]) => cn(
    "inline-flex items-center gap-1 border-b-2 px-1 py-2.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-1.5 sm:px-3 sm:text-sm",
    active === view
      ? "border-primary font-semibold text-amber-800 dark:text-primary"
      : "border-transparent text-muted-foreground hover:text-foreground",
  );

  return (
    <nav aria-label="FC Collection views" className="flex w-fit max-w-full gap-1 border-b">
      <Link to="/fc-collection/overview" aria-current={active === "overview" ? "page" : undefined} className={linkClass("overview")}><LayoutDashboard aria-hidden="true" className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />Overview</Link>
      <Link to="/fc-collection/collections" aria-current={active === "collections" ? "page" : undefined} className={linkClass("collections")}><Library aria-hidden="true" className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />Collections</Link>
      <Link to="/fc-collection/rankings" aria-current={active === "rankings" ? "page" : undefined} className={linkClass("rankings")}><Trophy aria-hidden="true" className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />Rankings</Link>
    </nav>
  );
}
