import type { CraftingRecipeSnapshot } from "../../types";
import { PreviewIcon } from "./PreviewIcon";

export function IngredientGroup({
  title,
  items,
  craftMultiplier,
  emptyText,
}: {
  title: string;
  items: CraftingRecipeSnapshot["ingredients"];
  craftMultiplier: number;
  emptyText: string;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      {items.length === 0 ? (
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          {emptyText}
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <div
              key={`${title}-${item.itemId}`}
              className="flex min-w-0 items-center gap-2 rounded-md border bg-muted/20 p-2"
            >
              <PreviewIcon icon={item.icon} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.amount * craftMultiplier} needed
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
