import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { MeowketCartGroup } from "../../types";
import { formatGil } from "../../utils/formatting";
import { cartWorldTotalTooltip } from "../../utils/profitDisplay";
import { MathTooltip } from "../MathTooltip";
import { CartItemRow } from "./CartItemRow";

export function CartRouteByWorld({
  groups,
  onItemBoughtChange,
  onItemMissing,
  onStopBoughtChange,
}: {
  groups: MeowketCartGroup[];
  onItemBoughtChange: (
    batchId: string,
    itemKey: string,
    bought: boolean,
  ) => void;
  onItemMissing: (batchId: string, itemKey: string) => void;
  onStopBoughtChange: (world: string, bought: boolean) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {groups.map((group, index) => {
        const actionableItems = group.items.filter(
          (item) => item.status !== "missing" && item.status !== "removing",
        );
        const bought =
          actionableItems.length > 0 &&
          actionableItems.every((item) => item.status === "bought");
        return (
          <div key={group.world} className="rounded-lg border p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2">
                <Checkbox
                  className="mt-1"
                  checked={bought}
                  disabled={actionableItems.length === 0}
                  aria-label={`Mark ${group.world} stop as bought`}
                  onCheckedChange={(checked) =>
                    onStopBoughtChange(group.world, checked === true)
                  }
                />
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Stop {index + 1}
                  </p>
                  <p className="font-medium">{group.world}</p>
                  <p className="text-xs text-muted-foreground">
                    {group.openCount} open / {group.items.length} stack
                    {group.items.length === 1 ? "" : "s"}
                  </p>
                </div>
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
                <CartItemRow
                  key={item.key}
                  item={item}
                  onBoughtChange={onItemBoughtChange}
                  onMissing={onItemMissing}
                />
              ))}
            </div>
          </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}
