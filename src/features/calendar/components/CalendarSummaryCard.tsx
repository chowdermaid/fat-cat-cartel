import type { Dispatch, SetStateAction } from "react";
import { Cake, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MONTH_FORMATTER } from "../constants";
import type { PlannerEvent } from "../types";
import { CreateEventDialog } from "./CreateEvent/CreateEventDialog";
import { ReviewEventRequestsDialog } from "./Requests/ReviewEventRequestsDialog";

export function CalendarSummaryCard({
  canCreateEvents,
  canReviewEventRequests,
  createMode,
  onEventCreated,
  sessionToken,
  setVisibleMonth,
  visibleBirthdaysCount,
  visibleMonth,
  visiblePlannerEventsCount,
}: {
  canCreateEvents: boolean;
  canReviewEventRequests: boolean;
  createMode: "direct" | "request";
  onEventCreated: (event: PlannerEvent) => void;
  sessionToken: string | null;
  setVisibleMonth: Dispatch<SetStateAction<Date>>;
  visibleBirthdaysCount: number;
  visibleMonth: Date;
  visiblePlannerEventsCount: number;
}) {
  return (
    <div className="relative rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold font-serif">
              {MONTH_FORMATTER.format(visibleMonth)}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {visibleBirthdaysCount + visiblePlannerEventsCount > 0
                ? `${visibleBirthdaysCount + visiblePlannerEventsCount} calendar item${visibleBirthdaysCount + visiblePlannerEventsCount === 1 ? "" : "s"} this month`
                : "No calendar items this month"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:ml-2">
            <Badge
              variant="outline"
              className="h-8 gap-1.5 rounded-full border-border bg-muted px-3 font-medium text-muted-foreground"
            >
              <Cake className="h-3.5 w-3.5" />
              {visibleBirthdaysCount} Birthday
              {visibleBirthdaysCount === 1 ? "" : "s"}
            </Badge>
            <Badge
              variant="outline"
              className="h-8 gap-1.5 rounded-full border-border bg-muted px-3 font-medium text-muted-foreground"
            >
              <Users className="h-3.5 w-3.5" />
              {visiblePlannerEventsCount} Event
              {visiblePlannerEventsCount === 1 ? "" : "s"}
            </Badge>
          </div>
        </div>
        {(canCreateEvents || canReviewEventRequests) && (
          <div className="flex flex-wrap items-center gap-2">
            {canReviewEventRequests && (
              <ReviewEventRequestsDialog
                sessionToken={sessionToken}
                onApproved={(event) => {
                  onEventCreated(event);
                  const eventDate = new Date(event.startAt);
                  setVisibleMonth(
                    new Date(eventDate.getFullYear(), eventDate.getMonth(), 1),
                  );
                }}
              />
            )}
            {canCreateEvents && (
              <CreateEventDialog
                sessionToken={sessionToken}
                mode={createMode}
                onCreated={(event) => {
                  onEventCreated(event);
                  const eventDate = new Date(event.startAt);
                  setVisibleMonth(
                    new Date(eventDate.getFullYear(), eventDate.getMonth(), 1),
                  );
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
