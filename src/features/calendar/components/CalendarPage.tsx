import { useRef, useState } from "react";
import { Cake } from "lucide-react";
import { useAdminAuth } from "@/features/admin/hooks/useAdminAuth";
import happyCat from "@/assets/fatcat/fc_happy_outline.png";
import { useCalendarAnimations } from "../hooks/useCalendarAnimations";
import { useCalendarData } from "../hooks/useCalendarData";
import type { PlannerEvent } from "../types";
import { CalendarGrid } from "./Grid/CalendarGrid";
import { LoadingGrid } from "./Grid/LoadingGrid";
import { CalendarHeader } from "./CalendarHeader";
import { CalendarMonthList } from "./CalendarMonthList";
import { CalendarSummaryCard } from "./CalendarSummaryCard";

export function CalendarPage() {
  const auth = useAdminAuth();
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const pageRef = useRef<HTMLDivElement>(null);
  const {
    calendarDays,
    eventsByDate,
    failed,
    loading,
    setPlannerEvents,
    totalEvents,
    visibleBirthdays,
    visiblePlannerEvents,
    visibleYear,
  } = useCalendarData(visibleMonth);

  const canCreateEvents =
    auth.authed &&
    (auth.session?.isAdmin === true || auth.session?.isHousecat === true);
  const canReviewEventRequests = auth.authed && auth.session?.isAdmin === true;

  useCalendarAnimations({ loading, pageRef, visibleMonth });

  function addPlannerEvent(event: PlannerEvent) {
    setPlannerEvents((current) => {
      const withoutExisting = current.filter((item) => item.id !== event.id);
      return [...withoutExisting, event].sort((a, b) => a.startAt - b.startAt);
    });
  }

  const today = new Date();

  return (
    <div ref={pageRef} className="relative space-y-5 overflow-hidden">
      <img
        src={happyCat}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-0 hidden w-28 opacity-60 sm:block md:w-36"
      />

      <CalendarHeader setVisibleMonth={setVisibleMonth} />

      <CalendarSummaryCard
        canCreateEvents={canCreateEvents}
        canReviewEventRequests={canReviewEventRequests}
        createMode={auth.session?.isAdmin === true ? "direct" : "request"}
        onEventCreated={addPlannerEvent}
        sessionToken={auth.sessionToken}
        setVisibleMonth={setVisibleMonth}
        visibleBirthdaysCount={visibleBirthdays.length}
        visibleMonth={visibleMonth}
        visiblePlannerEventsCount={visiblePlannerEvents.length}
      />

      {failed && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Could not load birthdays right now.
        </div>
      )}

      {loading ? (
        <LoadingGrid />
      ) : totalEvents === 0 ? (
        <div className="rounded-lg border bg-card px-4 py-10 text-center">
          <Cake className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No calendar items found.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add birthdays to member profiles or sync Discord planner events.
          </p>
        </div>
      ) : (
        <CalendarGrid
          calendarDays={calendarDays}
          eventsByDate={eventsByDate}
          today={today}
        />
      )}

      <CalendarMonthList
        visibleBirthdays={visibleBirthdays}
        visiblePlannerEvents={visiblePlannerEvents}
        visibleYear={visibleYear}
      />
    </div>
  );
}
