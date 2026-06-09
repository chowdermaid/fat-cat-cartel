import { ShoppingCart, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { MeowketCartBatch, MeowketCartSummary } from "../../types";
import { formatGil, formatQuantity } from "../../utils/formatting";
import { profitToneClass } from "../../utils/profitDisplay";
import {
  cartProfitTooltip,
  cartSellValueTooltip,
} from "../../utils/profitDisplay";
import { MathTooltip } from "../MathTooltip";
import { CartLineIcon } from "./CartItemRow";
import { CartRouteByWorld } from "./CartRouteByWorld";

export function MeowketCartPopover({
  batches,
  onClear,
  onRemoveBatch,
  summary,
}: {
  batches: MeowketCartBatch[];
  onClear: () => void;
  onRemoveBatch: (batchId: string) => void;
  summary: MeowketCartSummary;
}) {
  const hasBatches = batches.length > 0;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          className="gap-2 shadow-lg"
          variant="secondary"
        >
          <ShoppingCart className="h-4 w-4" />
          Cart route
          <Badge
            variant="outline"
            className="border-border bg-muted text-muted-foreground"
          >
            {batches.length} / {formatGil(summary.materialCost)}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="top"
        className="w-[48rem] max-w-[calc(100vw-2rem)] p-0"
      >
        <ScrollArea
          className="max-h-[80vh] min-h-0 min-w-0"
          viewportClassName="max-h-[80vh]"
        >
          <div className="min-w-0 p-4">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-medium">Cart route</p>
                <p className="text-xs text-muted-foreground">
                  Accumulated missing materials across added crafts.
                </p>
                <CartWarningBadges badges={summary.warningBadges} />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hasBatches}
                onClick={onClear}
              >
                Clear cart
              </Button>
            </div>

            {!hasBatches ? (
              <p className="text-sm text-muted-foreground">
                Add a calculated craft to start a cart route.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-2 sm:grid-cols-3">
                  <MiniStat
                    label="Remaining material cost"
                    value={formatGil(summary.materialCost)}
                  />
                  <MathTooltip content={cartSellValueTooltip(summary)}>
                    <div>
                      <MiniStat
                        label="Estimated sell value"
                        value={formatGil(summary.sellRevenue)}
                      />
                    </div>
                  </MathTooltip>
                  <MathTooltip content={cartProfitTooltip(summary)}>
                    <div>
                      <MiniStat
                        label="Profit"
                        value={formatGil(summary.netProfit)}
                        valueClassName={profitToneClass(summary.netProfit)}
                      />
                    </div>
                  </MathTooltip>
                </div>

                <div className="rounded-lg border">
                  <div className="border-b px-3 py-2">
                    <p className="text-sm font-medium">Crafted output</p>
                  </div>
                  <ScrollArea
                    className="max-h-56 min-h-0 min-w-0"
                    viewportClassName="max-h-56"
                  >
                    <div className="min-w-0 divide-y">
                      {batches.map((batch) => (
                        <div
                          key={batch.id}
                          className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <CartLineIcon iconUrl={batch.itemIconUrl} />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {batch.itemName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Requested{" "}
                                {formatQuantity(batch.requestedQuantity)}, sells{" "}
                                {formatQuantity(batch.sellQuantity)} at{" "}
                                {formatGil(batch.sellUnitPrice)} each.
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 sm:text-right">
                            <div>
                              <p
                                className={`text-sm font-medium ${profitToneClass(batch.netProfit)}`}
                              >
                                {formatGil(batch.netProfit)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                profit
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Remove ${batch.itemName} from cart`}
                              onClick={() => onRemoveBatch(batch.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <CartRouteByWorld groups={summary.groups} />
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function CartWarningBadges({
  badges,
}: {
  badges: MeowketCartSummary["warningBadges"];
}) {
  if (badges.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {badges.map((badge) => (
        <Badge key={badge.label} variant={badge.variant} title={badge.title}>
          {badge.label}
        </Badge>
      ))}
    </div>
  );
}

function MiniStat({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold ${valueClassName ?? ""}`}>{value}</p>
    </div>
  );
}
