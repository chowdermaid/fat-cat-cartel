import { PackageSearch } from "lucide-react";
import type { MeowketItemSearchResult } from "../types";

export function ItemIcon({
  item,
  unframed = false,
}: {
  item: MeowketItemSearchResult;
  unframed?: boolean;
}) {
  const className = unframed
    ? "flex h-full w-full shrink-0 items-center justify-center overflow-hidden"
    : "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted";
  return (
    <span className={className}>
      {item.iconUrl ? (
        <img
          src={item.iconUrl}
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
