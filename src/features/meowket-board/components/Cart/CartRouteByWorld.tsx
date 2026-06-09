import { ScrollArea } from "@/components/ui/scroll-area";
import type { MeowketCartGroup } from "../../types";
import { formatGil } from "../../utils/formatting";
import { cartWorldTotalTooltip } from "../../utils/profitDisplay";
import { MathTooltip } from "../MathTooltip";
import { CartItemRow } from "./CartItemRow";

export function CartRouteByWorld({
  groups,
}: {
  groups: MeowketCartGroup[];
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {groups.map((group, index) => (
        <div key={group.world} className="rounded-lg border p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Stop {index + 1}
              </p>
              <p className="font-medium">{group.world}</p>
              <p className="text-xs text-muted-foreground">
                {group.items.length} stack
                {group.items.length === 1 ? "" : "s"}
              </p>
            </div>
            <MathTooltip content={cartWorldTotalTooltip(group)}>
              <p className="text-sm font-medium">
                {formatGil(group.worldTotal)}
              </p>
            </MathTooltip>
          </div>
          <ScrollArea
            className="mt-3 max-h-64 min-h-0 min-w-0"
            viewportClassName="max-h-64"
          >
            <div className="min-w-0 space-y-2 pr-3">
              {group.items.map((item) => (
                <CartItemRow key={item.key} item={item} />
              ))}
            </div>
          </ScrollArea>
        </div>
      ))}
    </div>
  );
}
