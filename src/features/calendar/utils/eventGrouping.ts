import type {
  BirthdayEvent,
  CalendarEvent,
  PlannerEvent,
} from "../types";
import { birthdayKey, dateKey, eventVisibleInYear } from "./calendarDates";

export function groupEventsByDate({
  birthdayEvents,
  plannerEvents,
  visibleYear,
}: {
  birthdayEvents: BirthdayEvent[];
  plannerEvents: PlannerEvent[];
  visibleYear: number;
}): Map<string, CalendarEvent[]> {
  const grouped = new Map<string, CalendarEvent[]>();
  for (const event of birthdayEvents) {
    if (!eventVisibleInYear(event, visibleYear)) continue;
    const key = birthdayKey(event.month, event.day);
    grouped.set(key, [...(grouped.get(key) ?? []), event]);
  }
  for (const event of plannerEvents) {
    const key = dateKey(new Date(event.startAt));
    grouped.set(key, [...(grouped.get(key) ?? []), event]);
  }
  for (const [key, items] of grouped) {
    grouped.set(
      key,
      items.sort((a, b) => {
        if (a.type === b.type) {
          if (a.type === "planner" && b.type === "planner")
            return a.startAt - b.startAt;
          return 0;
        }
        return a.type === "planner" ? -1 : 1;
      }),
    );
  }
  return grouped;
}
