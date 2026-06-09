import { PackageSearch } from "lucide-react";
import type { MeowketCartGroup } from "../../types";
import { formatGil, formatQuantity } from "../../utils/formatting";
import { MathTooltip } from "../MathTooltip";

type CartRouteItem = MeowketCartGroup["items"][number];

export function CartItemRow({ item }: { item: CartRouteItem }) {
  return (
    <div className="rounded-md border bg-background/60 p-2">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <CartLineIcon iconUrl={item.iconUrl} size="sm" />
          <MathTooltip content={item.name}>
            <p className="min-w-0 truncate text-xs font-medium">
              {formatQuantity(item.quantity)}x {item.name}
            </p>
          </MathTooltip>
        </div>
        <MathTooltip content={`${formatGil(item.unitPrice)} each`}>
          <p className="shrink-0 text-right text-xs font-medium tabular-nums">
            {formatGil(item.totalPrice)}
          </p>
        </MathTooltip>
      </div>
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
