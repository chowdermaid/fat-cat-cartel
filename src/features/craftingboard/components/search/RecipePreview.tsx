import { Hammer, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CraftingRecipe } from "../../api/xivapi";
import type { CraftingSelectedItem } from "../../types";
import { safeArray } from "../../utils/arrays";
import { IngredientGroup } from "../shared/IngredientGroup";
import { PreviewIcon } from "../shared/PreviewIcon";
import { QuantityControl } from "../shared/QuantityControl";

export function RecipePreview({
  selectedRecipe,
  preview,
  loading,
  error,
  quantity,
  onQuantityChange,
  onAdd,
}: {
  selectedRecipe: CraftingRecipe | null;
  preview: CraftingSelectedItem | null;
  loading: boolean;
  error: string;
  quantity: number;
  onQuantityChange: (value: number) => void;
  onAdd: () => void;
}) {
  if (!selectedRecipe) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex min-h-80 flex-col items-center justify-center gap-3 text-center">
          <Hammer className="h-10 w-10 text-muted-foreground/60" />
          <div>
            <p className="font-medium">No item selected</p>
            <p className="text-sm text-muted-foreground">
              Search an item to expand ingredients, crystals, clusters, and
              precrafts.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex gap-3">
            <Skeleton className="h-12 w-12 rounded-md" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/40 bg-destructive/5">
        <CardContent className="flex min-h-80 flex-col items-center justify-center gap-3 text-center">
          <Loader2 className="h-8 w-8 text-destructive" />
          <div>
            <p className="font-medium">Could not expand recipe</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!preview) return null;

  const recipe = preview.recipeSnapshot;
  const amountResult = recipe.amountResult || 1;
  const ingredients = safeArray(recipe.ingredients);
  const craftsNeeded = Math.ceil(quantity / amountResult);

  return (
    <Card>
      <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <PreviewIcon icon={preview.itemIcon} size="lg" />
          <div className="min-w-0">
            <CardTitle className="line-clamp-2 font-serif text-2xl">
              {preview.itemName}
            </CardTitle>
            <CardDescription>
              {recipe.crafter}
              {recipe.recipeLevel !== null ? ` Lv. ${recipe.recipeLevel}` : ""}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <QuantityControl
            value={quantity}
            onChange={onQuantityChange}
            editable={false}
            centered={false}
          />
          <Button type="button" onClick={onAdd}>
            Add to request
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <IngredientGroup
          title="Crafting Ingredients"
          items={ingredients}
          craftMultiplier={craftsNeeded}
          emptyText="No non-crystal ingredients listed."
        />
      </CardContent>
    </Card>
  );
}
