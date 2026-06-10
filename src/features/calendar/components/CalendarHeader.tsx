import type { Dispatch, SetStateAction } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addMonths } from "../utils/calendarDates";

export function CalendarHeader({
  setVisibleMonth,
}: {
  setVisibleMonth: Dispatch<SetStateAction<Date>>;
}) {
  return (
    <div className="relative flex flex-wrap items-start justify-between gap-3 pr-0 sm:pr-32">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold font-serif">
          <CalendarDays className="h-7 w-7 text-muted-foreground" />
          Calendar
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Birthdays & Events!
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setVisibleMonth((current) => addMonths(current, -1))}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            const now = new Date();
            setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1));
          }}
        >
          Today
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
