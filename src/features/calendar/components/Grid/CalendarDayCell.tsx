import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CalendarDay, CalendarEvent } from "../../types";
import { sameDate } from "../../utils/calendarDates";
import { BirthdayChip } from "../Events/BirthdayChip";
import { PlannerChip } from "../Events/PlannerChip";

export function CalendarDayCell({
  day,
  events,
  today,
}: {
  day: CalendarDay;
  events: CalendarEvent[];
  today: Date;
}) {
  const isToday = sameDate(day.date, today);

  return (
    <div
      className={cn(
        "calendar-cell min-h-28 border-b border-r p-2 transition-colors last:border-r-0 sm:min-h-32",
        day.inMonth ? "bg-card" : "bg-muted/25 text-muted-foreground",
        isToday && "bg-primary/5",
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span
          className={cn(
            "flex h-6 min-w-6 items-center justify-center rounded-md text-xs font-semibold",
            isToday && "bg-primary text-primary-foreground",
          )}
        >
          {day.date.getDate()}
        </span>
        {events.length > 0 && (
          <Badge
            variant="outline"
            className="hidden px-1.5 py-0 text-[0.62rem] sm:inline-flex"
          >
            {events.length}
          </Badge>
        )}
      </div>

      <div className="space-y-1">
        {events.map((event) =>
          event.type === "birthday" ? (
            <BirthdayChip key={`birthday-${event.lodestoneId}`} event={event} />
          ) : (
            <PlannerChip key={`planner-${event.id}`} event={event} />
          ),
        )}
      </div>
    </div>
  );
}
