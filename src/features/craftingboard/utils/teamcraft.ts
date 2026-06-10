import { TEAMCRAFT_IMPORT_BASE_URL } from "../constants";
import type { CraftingRequestDashboardItem } from "../types";

export function itemWebUrl(itemId: number) {
  return `https://ffxivteamcraft.com/db/en/item/${itemId}`;
}

export function teamcraftImportUrl(items: CraftingRequestDashboardItem[]) {
  const importString = items
    .map((item) => {
      const itemId = Math.trunc(Number(item.itemId));
      const recipeId = Math.trunc(Number(item.selectedRecipeId));
      const quantity = Math.max(1, Math.trunc(Number(item.quantity)));
      if (!Number.isFinite(itemId) || itemId <= 0) return null;
      return [
        itemId,
        Number.isFinite(recipeId) && recipeId > 0 ? recipeId : "null",
        Number.isFinite(quantity) ? quantity : 1,
      ].join(",");
    })
    .filter((row): row is string => Boolean(row))
    .join(";");

  if (!importString) return null;
  return `${TEAMCRAFT_IMPORT_BASE_URL}/${window.btoa(importString)}`;
}