import { Hammer } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CraftingRequestDashboardItem } from "../../types";
import { jobIconSrc } from "../../utils/icons";

export function ItemIcon({
  item,
  size = "md",
}: {
  item?: CraftingRequestDashboardItem;
  size?: "sm" | "md";
}) {
  const jobIcon = jobIconSrc(item?.recipeSnapshot?.crafter);

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center",
        size === "sm" ? "h-10 w-10" : "h-12 w-12",
      )}
    >
      {jobIcon ? (
        <img
          src={jobIcon}
          alt=""
          className={cn(
            "object-contain",
            size === "sm" ? "h-9 w-9" : "h-11 w-11",
          )}
          loading="lazy"
        />
      ) : (
        <Hammer className="h-5 w-5 text-muted-foreground" />
      )}
    </div>
  );
}
