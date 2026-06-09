import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  MeowketItemSearchResult,
  MeowketProfitResult,
} from "../types";
import { ItemIcon } from "./ItemIcon";
import { MathTooltip } from "./MathTooltip";

export function SelectedCraftCard({
  calculation,
  onOpenSearch,
  selectedItem,
}: {
  calculation: MeowketProfitResult | null;
  onOpenSearch: () => void;
  selectedItem: MeowketItemSearchResult | null;
}) {
  const item = calculation?.item;
  return (
    <div className="flex min-w-48 flex-1 items-center gap-2">
      <button
        type="button"
        className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={onOpenSearch}
        aria-label="Choose item"
      >
        {selectedItem ? (
          <ItemIcon item={selectedItem} unframed />
        ) : (
          <Search className="h-5 w-5 text-muted-foreground" />
        )}
      </button>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">
          {selectedItem?.name ?? "No item selected"}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {item ? "Calculated craft" : "Choose craftable item"}
        </p>
      </div>
      <MathTooltip content="Choose another craftable item">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={onOpenSearch}
          aria-label="Choose another craftable item"
        >
          <Search className="h-4 w-4" />
        </Button>
      </MathTooltip>
    </div>
  );
}
