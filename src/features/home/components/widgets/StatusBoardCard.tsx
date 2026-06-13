import { Cake, CalendarDays, Hammer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HomeCraftingStatus } from "../../types";
import { ClippingCard } from "../newspaper/ClippingCard";

function StatusRow({
  description,
  icon: Icon,
  label,
  value,
}: {
  description: string;
  icon: typeof Hammer;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border bg-background/70 p-3">
      <div className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-2 text-sm font-medium text-foreground">{value}</p>
      <p className="mt-1 text-xs leading-snug text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function CraftingStatusRow({
  craftingStatus,
}: {
  craftingStatus: HomeCraftingStatus;
}) {
  return (
    <div className="rounded-md border bg-background/70 p-3">
      <div className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <Hammer className="h-3.5 w-3.5" />
        Crafting
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge variant="secondary">{craftingStatus.openCount} open</Badge>
        <Badge variant="outline">
          {craftingStatus.inProgressCount} in progress
        </Badge>
      </div>
    </div>
  );
}

export function StatusBoardCard({
  craftingStatus,
  nextBirthdayText,
  nextEventText,
  nextEventWhen,
}: {
  craftingStatus: HomeCraftingStatus;
  nextBirthdayText: string;
  nextEventText: string;
  nextEventWhen: string;
}) {
  return (
    <ClippingCard className="gazette-reveal border-primary/30" rotate="left">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-serif text-lg">
          <Hammer className="h-4 w-4 text-primary" />
          Status Board
        </CardTitle>
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Current signals
        </p>
      </CardHeader>
      <CardContent className="grid gap-3">
        <CraftingStatusRow craftingStatus={craftingStatus} />
        <StatusRow
          description={nextEventWhen}
          icon={CalendarDays}
          label="Upcoming event"
          value={nextEventText}
        />
        <StatusRow
          description="Next birthday on file."
          icon={Cake}
          label="Upcoming birthday"
          value={nextBirthdayText}
        />
      </CardContent>
    </ClippingCard>
  );
}
