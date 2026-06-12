import type { ElementType } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

export function ClassifiedLink({
  description,
  icon: Icon,
  label,
  to,
}: {
  description: string;
  icon: ElementType;
  label: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="group block rounded-md border border-dashed bg-background/70 p-3 transition-colors hover:border-primary/40"
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        Classified
      </div>
      <p className="mt-2 font-serif text-lg font-semibold leading-tight text-foreground">
        {label}
      </p>
      <p className="mt-1 text-xs leading-snug text-muted-foreground">
        {description}
      </p>
      <ArrowRight className="mt-2 h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}
