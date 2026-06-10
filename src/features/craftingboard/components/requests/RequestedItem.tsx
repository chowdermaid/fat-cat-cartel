import { ExternalLink } from "lucide-react";
import type { CraftingRequestDashboardItem } from "../../types";
import { itemWebUrl } from "../../utils/teamcraft";
import { PreviewIcon } from "../shared/PreviewIcon";

export function RequestedItem({ item }: { item: CraftingRequestDashboardItem }) {
  const recipe = item.recipeSnapshot ?? {};

  return (
    <a
      href={itemWebUrl(item.itemId)}
      target="_blank"
      rel="noreferrer"
      className="group flex min-w-0 items-center gap-2 rounded-lg border bg-muted/20 p-2 transition hover:border-primary/50 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      title={`Open ${item.itemName}`}
    >
      <PreviewIcon icon={item.itemIcon} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {item.quantity}x {item.itemName}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {recipe.crafter ?? "Crafter"}
          {recipe.recipeLevel !== null ? ` Lv. ${recipe.recipeLevel}` : ""}
        </p>
      </div>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100" />
    </a>
  );
}
