import { PackageSearch } from "lucide-react";
import type { MeowketMaterial } from "../../types";

export function MaterialIcon({ material }: { material: MeowketMaterial }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
      {material.iconUrl ? (
        <img
          src={material.iconUrl}
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
