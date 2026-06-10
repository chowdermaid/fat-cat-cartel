import { Link } from "@tanstack/react-router";
import { Cake, CalendarDays, ExternalLink, User } from "lucide-react";
import { SHORT_DATE_FORMATTER, TIME_FORMATTER } from "../constants";
import type { BirthdayEvent, PlannerEvent } from "../types";

export function CalendarMonthList({
  visibleBirthdays,
  visiblePlannerEvents,
  visibleYear,
}: {
  visibleBirthdays: BirthdayEvent[];
  visiblePlannerEvents: PlannerEvent[];
  visibleYear: number;
}) {
  if (visiblePlannerEvents.length === 0 && visibleBirthdays.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">This Month</h2>
      </div>
      <div className="divide-y">
        {visiblePlannerEvents.map((event) => (
          <div key={event.id} className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{event.title}</p>
              <p className="text-xs text-muted-foreground">
                {TIME_FORMATTER.format(new Date(event.startAt))}
              </p>
            </div>
            {event.sourceUrl && (
              <a
                href={event.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label={`Open ${event.title} in Discord`}
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        ))}
        {visibleBirthdays.map((event) => (
          <Link
            key={event.lodestoneId}
            to="/members/$lodestoneId"
            params={{ lodestoneId: event.lodestoneId }}
            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
          >
            {event.avatarUrl ? (
              <img
                src={event.avatarUrl}
                alt=""
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{event.name}</p>
              <p className="text-xs text-muted-foreground">
                {SHORT_DATE_FORMATTER.format(
                  new Date(visibleYear, event.month - 1, event.day),
                )}
              </p>
            </div>
            <Cake className="h-4 w-4 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}
