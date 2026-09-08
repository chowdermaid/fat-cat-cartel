import { Link } from "@tanstack/react-router";
import {
  Coins,
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
  {
    label: "Spud Jar",
    to: "/spud-jar",
    description: "Visit the Spud Jar.",
    icon: Coins,
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
    <section className="gazette-reveal flex w-full flex-wrap items-center gap-x-4 gap-y-2 border-y border-dashed px-2 py-2">
      <div className="flex shrink-0 items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center text-primary">
          <Wrench className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h2 className="font-serif text-base font-semibold leading-tight">
            FC Tools
          </h2>
        </div>
      </div>
      <nav aria-label="FC tools" className="flex min-w-0 flex-wrap items-center gap-1">
        {visibleTools.map(({ description, icon: Icon, label, to }) => (
          <Link
            key={to}
            to={to}
            title={description}
            className="flex min-h-11 items-center gap-2 rounded-sm px-3 py-2 text-sm font-semibold transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </section>
  );
}
