import { Hammer } from "lucide-react";
import { cn } from "@/lib/utils";
import { getXivapiIconUrl } from "../../api/xivapi";
import type { CraftingRequestDashboardItem } from "../../types";

export function PreviewIcon({
  icon,
  size = "sm",
}: {
  icon?: CraftingRequestDashboardItem["itemIcon"];
  size?: "sm" | "lg";
}) {
  const iconUrl = getXivapiIconUrl(icon);

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md border bg-muted",
        size === "lg" ? "h-12 w-12" : "h-8 w-8",
      )}
    >
      {iconUrl ? (
        <img
          src={iconUrl}
          alt=""
          className="h-full w-full rounded-md object-cover"
          loading="lazy"
        />
      ) : (
        <Hammer className="h-4 w-4 text-muted-foreground" />
      )}
    </div>
  );
}
