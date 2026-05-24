import { Button } from "@/components/ui/button";
import type { CollectionScope } from "../hooks/useCollectionScope";

interface CollectionScopeToggleProps {
  scope: CollectionScope;
  onChange: (scope: CollectionScope) => void;
}

export function CollectionScopeToggle({
  scope,
  onChange,
}: CollectionScopeToggleProps) {
  return (
    <div className="flex w-fit items-center gap-1 rounded-lg border bg-muted/30 p-1">
      <Button
        type="button"
        variant={scope === "fc" ? "default" : "ghost"}
        size="sm"
        className="h-7 px-3 text-xs"
        onClick={() => onChange("fc")}
      >
        FC
      </Button>
      <Button
        type="button"
        variant={scope === "all" ? "default" : "ghost"}
        size="sm"
        className="h-7 px-3 text-xs"
        onClick={() => onChange("all")}
      >
        FC and Friends
      </Button>
    </div>
  );
}
