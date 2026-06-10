import { CalendarDays } from "lucide-react";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import type { PlannerEvent } from "../../types";
import { PlannerTooltipContent } from "./PlannerTooltipContent";

export function PlannerChip({ event }: { event: PlannerEvent }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="group flex w-full min-w-0 items-center gap-1.5 rounded-md border border-primary/25 bg-primary/10 px-1.5 py-1 text-left text-[0.68rem] shadow-sm transition-colors hover:border-primary/60 hover:bg-primary/15"
        >
          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="min-w-0 flex-1 truncate font-medium group-hover:text-primary">
            {event.title}
          </span>
        </button>
      </TooltipTrigger>
      <PlannerTooltipContent event={event} />
    </Tooltip>
  );
}
