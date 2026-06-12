import { PackageSearch, PackageX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { MeowketCartGroup } from "../../types";
import { formatGil, formatQuantity } from "../../utils/formatting";
import { MathTooltip } from "../MathTooltip";

type CartRouteItem = MeowketCartGroup["items"][number];

export function CartItemRow({
  item,
  onBoughtChange,
  onMissing,
}: {
  item: CartRouteItem;
  onBoughtChange: (batchId: string, itemKey: string, bought: boolean) => void;
  onMissing: (batchId: string, itemKey: string) => void;
}) {
  const bought = item.status === "bought";
  const missing = item.status === "missing";
  const replacement = item.replacementForKey && !missing;
  const rowClassName = missing
    ? "border-destructive/40 bg-destructive/10 text-destructive"
    : replacement
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : bought
        ? "text-muted-foreground"
        : "bg-background/60";
  const noteClassName = missing
    ? "text-destructive"
    : replacement
      ? "text-emerald-700 dark:text-emerald-300"
      : "text-muted-foreground";
  return (
    <div
      className={`rounded-md border p-2 ${rowClassName}`}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
        <Checkbox
          checked={bought}
          disabled={missing}
          aria-label={`Mark ${item.name} as bought`}
          onCheckedChange={(checked) =>
            onBoughtChange(item.sourceBatchId, item.key, checked === true)
          }
        />
        <div className="flex min-w-0 items-center gap-2">
          <CartLineIcon iconUrl={item.iconUrl} size="sm" />
          <MathTooltip content={item.name}>
            <p
              className={`min-w-0 truncate text-xs font-medium ${
                missing ? "line-through" : ""
              }`}
            >
              {formatQuantity(item.quantity)}x {item.name}
            </p>
          </MathTooltip>
        </div>
        <div className="flex items-center gap-1">
          <MathTooltip content={`${formatGil(item.unitPrice)} each`}>
            <p
              className={`shrink-0 text-right text-xs font-medium tabular-nums ${
                missing ? "line-through" : ""
              }`}
            >
              {formatGil(item.totalPrice)}
            </p>
          </MathTooltip>
          <MathTooltip content="Gone">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={missing}
              aria-label={`Mark ${item.name} as gone`}
              onClick={() => onMissing(item.sourceBatchId, item.key)}
            >
              <PackageX className="h-4 w-4" />
            </Button>
          </MathTooltip>
        </div>
      </div>
      {item.note && (
        <p className={`mt-1 pl-8 text-xs ${noteClassName}`}>{item.note}</p>
      )}
    </div>
  );
}

export function CartLineIcon({
  iconUrl,
  size = "md",
}: {
  iconUrl?: string;
  size?: "sm" | "md";
}) {
  const dimensions = size === "sm" ? "h-6 w-6" : "h-8 w-8";
  return (
    <span
      className={`flex ${dimensions} shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted`}
    >
      {iconUrl ? (
        <img
          src={iconUrl}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <PackageSearch className="h-4 w-4 text-muted-foreground" />
      )}
    </span>
  );
}
