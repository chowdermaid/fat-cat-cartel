import { useEffect, useRef } from "react";
import { animate } from "animejs";
import { Check, ChevronsUpDown, Loader2, PackageOpen, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { CraftingRecipe, CraftingSearchItem } from "../api/xivapi";
import { MATERIAL_NOTE_MAX_LENGTH, materialStatusLabels } from "../constants";
import type { CraftingMaterialStatus, CraftingSelectedItem } from "../types";
import { safeArray } from "../utils/arrays";
import { handleNestedScrollAreaWheel } from "../utils/scroll";
import { RecipePreview } from "./search/RecipePreview";
import { SearchSkeleton } from "./search/SearchSkeleton";
import { PreviewIcon } from "./shared/PreviewIcon";
import { QuantityControl } from "./shared/QuantityControl";

export function CreateRequestDialog({
  open,
  onOpenChange,
  searchOpen,
  onSearchOpenChange,
  query,
  onQueryChange,
  normalizedQuery,
  results,
  searchLoading,
  searchError,
  selectedSource,
  selectedRecipeId,
  onRecipeChange,
  selectedRecipe,
  preview,
  previewLoading,
  previewError,
  previewQuantity,
  onPreviewQuantityChange,
  onSelectItem,
  onAddPreview,
  items,
  materialStatus,
  materialNote,
  commissionOffered,
  commissionGil,
  creating,
  error,
  isAuthed,
  onMaterialStatusChange,
  onMaterialNoteChange,
  onCommissionOfferedChange,
  onCommissionGilChange,
  onQuantityChange,
  onRemove,
  lastAddedRequestItemKey,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchOpen: boolean;
  onSearchOpenChange: (open: boolean) => void;
  query: string;
  onQueryChange: (value: string) => void;
  normalizedQuery: string;
  results: CraftingSearchItem[];
  searchLoading: boolean;
  searchError: string;
  selectedSource: CraftingSearchItem | null;
  selectedRecipeId: number | null;
  onRecipeChange: (recipeId: number | null) => void;
  selectedRecipe: CraftingRecipe | null;
  preview: CraftingSelectedItem | null;
  previewLoading: boolean;
  previewError: string;
  previewQuantity: number;
  onPreviewQuantityChange: (value: number) => void;
  onSelectItem: (item: CraftingSearchItem) => void;
  onAddPreview: () => void;
  items: CraftingSelectedItem[];
  materialStatus: CraftingMaterialStatus | "";
  materialNote: string;
  commissionOffered: boolean;
  commissionGil: string;
  creating: boolean;
  error: string;
  isAuthed: boolean;
  onMaterialStatusChange: (value: CraftingMaterialStatus) => void;
  onMaterialNoteChange: (value: string) => void;
  onCommissionOfferedChange: (value: boolean) => void;
  onCommissionGilChange: (value: string) => void;
  onQuantityChange: (recipeId: number, quantity: number) => void;
  onRemove: (recipeId: number) => void;
  lastAddedRequestItemKey: string;
  onSubmit: () => void;
}) {
  const requestItemsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const [recipeId] = lastAddedRequestItemKey.split(":");
    if (!recipeId || !requestItemsRef.current) return;

    const element = requestItemsRef.current.querySelector(
      `[data-request-item-id="${recipeId}"]`,
    );
    if (!element) return;

    animate(element, {
      opacity: [0, 1],
      translateY: [10, 0],
      scale: [0.97, 1],
      duration: 320,
      easing: "easeOutBack",
    });
  }, [lastAddedRequestItemKey]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-7xl p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-2xl">Request item crafted</DialogTitle>
          <DialogDescription>
            Search an item, preview its recipe, then submit request details.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[min(76vh,52rem)] px-6 pb-6">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,30rem)]">
            <div className="space-y-5">
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle className="font-serif text-xl">
                    Find item
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Popover open={searchOpen} onOpenChange={onSearchOpenChange}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={searchOpen}
                        className="h-11 w-full justify-between"
                      >
                        <span className="truncate text-muted-foreground">
                          {selectedSource?.itemName ?? "Search item..."}
                        </span>
                        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      className="w-[min(28rem,calc(100vw-2rem))] p-0"
                    >
                      <Command shouldFilter={false}>
                        <CommandInput
                          value={query}
                          onValueChange={onQueryChange}
                          placeholder="Classical Longsword"
                        />
                        <ScrollArea
                          className="h-72"
                          onWheelCapture={handleNestedScrollAreaWheel}
                        >
                          <CommandList className="max-h-none overflow-visible">
                            {normalizedQuery.length < 2 && (
                              <CommandEmpty>
                                Type at least 2 characters.
                              </CommandEmpty>
                            )}
                            {searchLoading && (
                              <div className="space-y-2 p-2">
                                {Array.from({ length: 4 }).map((_, index) => (
                                  <SearchSkeleton key={index} />
                                ))}
                              </div>
                            )}
                            {!searchLoading && searchError && (
                              <CommandEmpty>{searchError}</CommandEmpty>
                            )}
                            {!searchLoading &&
                              !searchError &&
                              normalizedQuery.length >= 2 &&
                              results.length === 0 && (
                                <CommandEmpty>
                                  No craftable items found.
                                </CommandEmpty>
                              )}
                            {!searchLoading &&
                              !searchError &&
                              results.length > 0 && (
                                <CommandGroup heading="Craftable items">
                                  {results.map((item) => (
                                    <CommandItem
                                      key={item.itemId}
                                      value={`${item.itemId}-${item.itemName}`}
                                      onSelect={() => onSelectItem(item)}
                                    >
                                      <PreviewIcon icon={item.itemIcon} />
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium">
                                          {item.itemName}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {safeArray(item.recipes).length}{" "}
                                          recipe
                                          {safeArray(item.recipes).length === 1
                                            ? ""
                                            : "s"}
                                        </p>
                                      </div>
                                      <Check
                                        className={cn(
                                          "h-4 w-4",
                                          selectedSource?.itemId === item.itemId
                                            ? "opacity-100"
                                            : "opacity-0",
                                        )}
                                      />
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              )}
                          </CommandList>
                        </ScrollArea>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {selectedSource && (
                    <div className="space-y-3">
                      {safeArray(selectedSource.recipes).length > 1 && (
                        <Select
                          value={selectedRecipeId?.toString() ?? ""}
                          onValueChange={(value) =>
                            onRecipeChange(Number(value))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose recipe" />
                          </SelectTrigger>
                          <SelectContent className="max-h-72">
                            {safeArray(selectedSource.recipes).map((recipe) => (
                              <SelectItem
                                key={recipe.recipeId}
                                value={recipe.recipeId.toString()}
                              >
                                {recipe.crafter}{" "}
                                {recipe.level !== null
                                  ? `Lv. ${recipe.level}`
                                  : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
              <RecipePreview
                selectedRecipe={selectedRecipe}
                preview={preview}
                loading={previewLoading}
                error={previewError}
                quantity={previewQuantity}
                onQuantityChange={onPreviewQuantityChange}
                onAdd={onAddPreview}
              />
            </div>

            <Card className="h-fit lg:sticky lg:top-0">
              <CardHeader>
                <CardTitle className="font-serif text-xl">
                  New Request
                </CardTitle>
                <CardDescription>
                  Add one or more craftable items.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
                    No items added yet.
                  </div>
                ) : (
                  <ScrollArea
                    className="h-80 pr-3"
                    onWheelCapture={handleNestedScrollAreaWheel}
                  >
                    <div ref={requestItemsRef} className="space-y-2">
                      {items.map((item) => (
                        <div
                          key={item.selectedRecipeId}
                          data-request-item-id={item.selectedRecipeId}
                          className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3"
                        >
                          <PreviewIcon icon={item.itemIcon} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">
                              {item.itemName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.recipeSnapshot?.crafter ?? "Crafter"}
                              {item.recipeSnapshot?.recipeLevel !== null &&
                              item.recipeSnapshot?.recipeLevel !== undefined
                                ? ` Lv. ${item.recipeSnapshot.recipeLevel}`
                                : ""}
                            </p>
                          </div>
                          <QuantityControl
                            value={item.quantity}
                            onChange={(quantity) =>
                              onQuantityChange(item.selectedRecipeId, quantity)
                            }
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => onRemove(item.selectedRecipeId)}
                            aria-label={`Remove ${item.itemName}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}

                <Separator />
                <div className="space-y-4">
                  <div>
                    <h3 className="font-serif text-xl font-semibold">
                      Request Details
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Material status is required.
                    </p>
                  </div>
                  <Select
                    value={materialStatus}
                    onValueChange={(value) =>
                      onMaterialStatusChange(value as CraftingMaterialStatus)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Material status" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(materialStatusLabels).map(
                        ([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>

                  {materialStatus === "requester_has_some_materials" && (
                    <div className="space-y-2">
                      <Label htmlFor="crafting-material-note">
                        Materials note
                      </Label>
                      <Input
                        id="crafting-material-note"
                        value={materialNote}
                        maxLength={MATERIAL_NOTE_MAX_LENGTH}
                        onChange={(event) =>
                          onMaterialNoteChange(event.target.value)
                        }
                        placeholder="What you have or still need"
                      />
                    </div>
                  )}

                  <div className="space-y-3 rounded-md border p-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="crafting-commission"
                        checked={commissionOffered}
                        onCheckedChange={(checked) =>
                          onCommissionOfferedChange(checked === true)
                        }
                      />
                      <Label htmlFor="crafting-commission">
                        I will commission
                      </Label>
                    </div>
                    <Input
                      type="number"
                      min={1}
                      inputMode="numeric"
                      value={commissionGil}
                      disabled={!commissionOffered}
                      onChange={(event) =>
                        onCommissionGilChange(event.target.value)
                      }
                      placeholder="Gil amount"
                    />
                  </div>

                  {!isAuthed && (
                    <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                      Member login required to create request.
                    </p>
                  )}
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button
                    type="button"
                    className="w-full"
                    disabled={creating || !isAuthed}
                    onClick={onSubmit}
                  >
                    {creating ? "Creating..." : "Create request"}
                    {creating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <PackageOpen className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
