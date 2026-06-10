import { ChevronRight, Sparkles } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Member } from "@/types";
import type { CraftingRequestDashboardItem } from "../../types";
import { combinedEligibility } from "../../utils/eligibility";
import { CrafterChip } from "../shared/CrafterChip";

export function EligibleCrafters({
  items,
  members,
}: {
  items: CraftingRequestDashboardItem[];
  members: Record<string, Member>;
}) {
  const eligibility = combinedEligibility(items, members);
  const crafters = eligibility.crafters;

  return (
    <Collapsible>
      <CollapsibleTrigger className="group flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-1 py-1 text-left text-xs font-medium uppercase text-muted-foreground transition hover:bg-muted/50">
        <span className="flex min-w-0 items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Eligible crafters</span>
        </span>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 transition group-data-[state=open]:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        {eligibility.status === "unknown" ? (
          <p className="text-sm text-muted-foreground">
            Eligibility unknown. Lodestone job levels have not been synced for
            this crafter job.
          </p>
        ) : crafters.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No eligible FC crafters found from synced job levels.
          </p>
        ) : (
          <ScrollArea className="max-h-16 pr-2">
            <div className="flex flex-wrap gap-2">
              {crafters.map((crafter) => (
                <CrafterChip
                  key={`${crafter.lodestoneId}-${crafter.job}`}
                  crafter={crafter}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
