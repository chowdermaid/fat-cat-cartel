import { Loader2 } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { MeowketItemSearchResult } from "../types";
import { ItemIcon } from "./ItemIcon";

export function ItemSearchDialog({
  error,
  loading,
  onOpenChange,
  onQueryChange,
  onSelect,
  open,
  query,
  results,
}: {
  error: string;
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  onQueryChange: (query: string) => void;
  onSelect: (item: MeowketItemSearchResult) => void;
  open: boolean;
  query: string;
  results: MeowketItemSearchResult[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Choose craftable item</DialogTitle>
          <DialogDescription>Search recipes by name.</DialogDescription>
        </DialogHeader>
        <Command shouldFilter={false} className="rounded-none border-t">
          <CommandInput
            value={query}
            onValueChange={onQueryChange}
            placeholder="Search item..."
          />
          <ScrollArea
            className="max-h-80 min-h-0 min-w-0"
            viewportClassName="max-h-80"
          >
            <CommandList className="max-h-none overflow-visible">
              {query.trim().length < 2 ? (
                <CommandEmpty>Type at least 2 characters.</CommandEmpty>
              ) : loading ? (
                <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching XIVAPI...
                </div>
              ) : error ? (
                <div className="px-4 py-6 text-sm text-destructive">
                  {error}
                </div>
              ) : results.length === 0 ? (
                <CommandEmpty>No craftable items found.</CommandEmpty>
              ) : (
                results.map((item) => (
                  <CommandItem
                    key={item.itemId}
                    className="cursor-pointer"
                    value={`${item.itemId}-${item.name}`}
                    onSelect={() => onSelect(item)}
                  >
                    <ItemIcon item={item} />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {item.name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {item.levelItem
                          ? `Item Lv. ${item.levelItem}`
                          : "Craftable item"}
                      </span>
                    </span>
                  </CommandItem>
                ))
              )}
            </CommandList>
          </ScrollArea>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
