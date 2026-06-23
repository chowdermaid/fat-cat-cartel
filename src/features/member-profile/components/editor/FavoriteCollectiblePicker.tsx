import { useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export type FavoriteCollectibleOption = {
  id: number;
  name: string;
  icon: string | null;
};

export function FavoriteCollectiblePicker({
  label,
  emptyText,
  options,
  value,
  onChange,
}: {
  label: string;
  emptyText: string;
  options: FavoriteCollectibleOption[];
  value: number | null | undefined;
  onChange: (value: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((option) => option.id === value) ?? null;
  const filteredOptions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) => option.name.toLowerCase().includes(needle));
  }, [options, query]);
  const disabled = options.length === 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        {selected && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="h-auto min-h-14 w-full justify-start gap-3 px-3 py-2 text-left"
      >
        {selected?.icon ? (
          <img
            src={selected.icon}
            alt=""
            className="h-10 w-10 shrink-0 rounded object-contain"
          />
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
            {selected ? selected.name.slice(0, 2) : "--"}
          </span>
        )}
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">
            {selected?.name ?? `Choose ${label.toLowerCase()}`}
          </span>
          <span className="block text-xs text-muted-foreground">
            {disabled ? emptyText : "Owned collection only"}
          </span>
        </span>
      </Button>
      {disabled && <p className="text-xs text-muted-foreground">{emptyText}</p>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[86vh] max-w-3xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Search ${label.toLowerCase()}...`}
                className="pl-9"
              />
            </div>
            <ScrollArea className="h-[58vh]" viewportClassName="h-[58vh]">
              {filteredOptions.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 pr-3 sm:grid-cols-4 lg:grid-cols-5">
                  {filteredOptions.map((option) => {
                    const isSelected = option.id === value;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          onChange(option.id);
                          setOpen(false);
                        }}
                        className={cn(
                          "group relative flex min-h-24 flex-col items-center gap-1.5 rounded-lg border bg-card p-2 text-center transition-colors hover:border-primary/60 hover:bg-muted/40",
                          isSelected && "border-primary bg-primary/10",
                        )}
                      >
                        {option.icon ? (
                          <img
                            src={option.icon}
                            alt=""
                            className="h-10 w-10 rounded object-contain"
                          />
                        ) : (
                          <span className="flex h-10 w-10 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                            {option.name.slice(0, 2)}
                          </span>
                        )}
                        <span className="line-clamp-2 text-xs font-medium leading-snug">
                          {option.name}
                        </span>
                        {isSelected && (
                          <span className="absolute right-2 top-2 rounded-full bg-primary p-1 text-primary-foreground">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No owned choices match that search.
                </div>
              )}
            </ScrollArea>
            <div className="flex justify-between gap-2 border-t pt-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                Clear favorite
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
