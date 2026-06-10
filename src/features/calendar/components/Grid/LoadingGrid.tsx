import { WEEKDAYS } from "../../constants";

export function LoadingGrid() {
  return (
    <div className="rounded-lg border bg-card">
      <div className="grid grid-cols-7 border-b bg-muted/40">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="px-2 py-2 text-center text-xs font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: 42 }, (_, index) => (
          <div
            key={index}
            className="min-h-28 border-b border-r p-2 last:border-r-0 sm:min-h-32"
          >
            <div className="h-4 w-6 animate-pulse rounded bg-muted" />
            <div className="mt-4 h-6 animate-pulse rounded bg-muted/70" />
          </div>
        ))}
      </div>
    </div>
  );
}
