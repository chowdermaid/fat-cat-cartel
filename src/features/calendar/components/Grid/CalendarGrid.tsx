import { TooltipProvider } from "@/components/ui/tooltip";
import { WEEKDAYS } from "../../constants";
import type { CalendarDay, CalendarEvent } from "../../types";
import { birthdayKey, dateKey } from "../../utils/calendarDates";
import { CalendarDayCell } from "./CalendarDayCell";

export function CalendarGrid({
  calendarDays,
  eventsByDate,
  today,
}: {
  calendarDays: CalendarDay[];
  eventsByDate: Map<string, CalendarEvent[]>;
  today: Date;
}) {
  return (
    <TooltipProvider delayDuration={120}>
      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="grid grid-cols-7 border-b bg-muted/40">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="px-1.5 py-2 text-center text-[0.68rem] font-medium text-muted-foreground sm:px-2 sm:text-xs"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {calendarDays.map((day) => {
            const keys = [
              birthdayKey(day.date.getMonth() + 1, day.date.getDate()),
              dateKey(day.date),
            ];
            const dayEvents = keys.flatMap(
              (key) => eventsByDate.get(key) ?? [],
            );
            return (
              <CalendarDayCell
                key={day.date.toISOString()}
                day={day}
                events={dayEvents}
                today={today}
              />
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
