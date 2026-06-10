import { Link } from "@tanstack/react-router";
import { User } from "lucide-react";
import type { BirthdayEvent } from "../../types";

export function BirthdayChip({ event }: { event: BirthdayEvent }) {
  return (
    <Link
      to="/members/$lodestoneId"
      params={{ lodestoneId: event.lodestoneId }}
      className="group flex min-w-0 items-center gap-1.5 rounded-md border bg-background/90 px-1.5 py-1 text-left text-[0.68rem] shadow-sm transition-colors hover:border-primary/60 hover:bg-primary/10"
    >
      {event.avatarUrl ? (
        <img
          src={event.avatarUrl}
          alt=""
          className="h-5 w-5 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted">
          <User className="h-3 w-3 text-muted-foreground" />
        </span>
      )}
      <span className="truncate font-medium group-hover:text-primary">
        {event.name}
      </span>
    </Link>
  );
}
