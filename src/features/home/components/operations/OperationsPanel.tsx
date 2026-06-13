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
    description: "Pick a mount quickly for the next run.",
    icon: Dices,
  },
  {
    label: "Crafting Board",
    to: "/craftingboard",
    description: "Request gear, food, furniture, and handoffs.",
    icon: Hammer,
  },
  {
    label: "Meowket Board",
    to: "/meowketboard",
    description: "Browse member market listings.",
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
    <section className="gazette-reveal h-full w-full rounded-lg border-y border-dashed bg-muted/30 px-4 py-4">
      <div className="mb-4 flex items-start gap-3">
        <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Wrench className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h2 className="font-serif text-2xl leading-tight">
            Operations Panel
          </h2>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Available tools
          </p>
        </div>
      </div>
      <div className="grid gap-2">
        {visibleTools.map(({ description, icon: Icon, label, to }) => (
          <Link
            key={to}
            to={to}
            className="group flex min-w-0 items-center gap-3 rounded-lg border border-dashed bg-background/70 p-3 text-left transition-colors hover:border-primary/50 hover:bg-muted/40"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
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
      </div>
    </section>
  );
}
