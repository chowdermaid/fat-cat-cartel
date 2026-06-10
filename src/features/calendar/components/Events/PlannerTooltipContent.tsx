import { Clock, ExternalLink, MapPin } from "lucide-react";
import { TooltipContent } from "@/components/ui/tooltip";
import {
  SHORT_DATE_FORMATTER,
  SHORT_TIME_FORMATTER,
  TIME_FORMATTER,
} from "../../constants";
import type { PlannerEvent } from "../../types";

export function PlannerTooltipContent({ event }: { event: PlannerEvent }) {
  return (
    <TooltipContent className="max-w-72 text-xs">
      <div className="space-y-2">
        <div>
          <p className="font-semibold text-popover-foreground">{event.title}</p>
          <p className="mt-1 flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3 w-3" />
            {TIME_FORMATTER.format(new Date(event.startAt))}
            {event.endAt
              ? ` - ${SHORT_TIME_FORMATTER.format(new Date(event.endAt))}`
              : ""}
          </p>
          {event.location && (
            <p className="mt-1 flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {event.location}
            </p>
          )}
        </div>
        {event.description && (
          <p className="whitespace-pre-wrap text-muted-foreground">
            {event.description}
          </p>
        )}
        <div className="flex items-center justify-between gap-3 border-t pt-2 text-muted-foreground">
          <span>
            Synced{" "}
            {event.lastSyncedAt
              ? SHORT_DATE_FORMATTER.format(new Date(event.lastSyncedAt))
              : "recently"}
          </span>
          {event.sourceUrl && (
            <a
              href={event.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-primary"
            >
              Discord
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </TooltipContent>
  );
}
