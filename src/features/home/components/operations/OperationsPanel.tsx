import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Dices,
  Hammer,
  HandCoins,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useAdminAuth } from "@/features/admin/hooks/useAdminAuth";

type OperationTool = {
  label: string;
  to: string;
  description: string;
  icon: LucideIcon;
  memberOnly?: boolean;
};

const OPERATION_TOOLS: OperationTool[] = [
  {
    label: "Mount Roulette",
    to: "/mount-roulette",
    description: "Pick the next mount.",
    icon: Dices,
  },
  {
    label: "Crafting Board",
    to: "/craftingboard",
    description: "Request gear, food, and furniture.",
    icon: Hammer,
  },
  {
    label: "Meowket Board",
    to: "/meowketboard",
    description: "Browse member listings.",
    icon: HandCoins,
    memberOnly: true,
  },
];

export function OperationsPanel() {
  const auth = useAdminAuth();
  const visibleTools = OPERATION_TOOLS.filter(
    (tool) =>
      !tool.memberOnly ||
      auth.sessionWasAdmin ||
      auth.authed ||
      auth.checking,
  );

  return (
    <section className="gazette-reveal w-full self-start px-2 py-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center text-primary">
          <Wrench className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h2 className="font-serif text-xl font-semibold leading-tight">
            FC Tools
          </h2>
        </div>
      </div>
      <nav aria-label="FC tools" className="divide-y divide-border">
        {visibleTools.map(({ description, icon: Icon, label, to }) => (
          <Link
            key={to}
            to={to}
            className="group flex min-w-0 items-center gap-3 rounded-sm px-2 py-4 text-left transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center text-primary">
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold leading-snug">
                {label}
              </span>
              <span className="mt-1 block text-xs leading-snug text-muted-foreground">
                {description}
              </span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </Link>
        ))}
      </nav>
    </section>
  );
}
