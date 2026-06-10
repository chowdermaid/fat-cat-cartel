import type { Collectible } from "@/features/fc-collection/types";
import type { FavoriteCollectibleOption } from "../components/editor/FavoriteCollectiblePicker";

export function isCollectible(value: unknown): value is Collectible {
  return value != null && typeof value === "object" && "owned" in value;
}

export function findRarest(
  ownedIds: number[],
  collectiblesById: Record<string, Collectible>,
): Collectible | null {
  let rarest: Collectible | null = null;
  let lowestOwned = Infinity;
  for (const id of ownedIds) {
    const collectible = collectiblesById[String(id)];
    if (!isCollectible(collectible)) continue;
    const owned = parseInt(collectible.owned, 10);
    if (!isNaN(owned) && owned < lowestOwned) {
      lowestOwned = owned;
      rarest = collectible;
    }
  }
  return rarest;
}

export function ownedPct(
  collectible: Collectible,
  allById: Record<string, Collectible>,
): number {
  const maxOwned = Math.max(
    ...Object.values(allById)
      .filter(isCollectible)
      .map((item) => parseInt(item.owned, 10))
      .filter((owned) => !isNaN(owned) && owned > 0),
  );
  const owned = parseInt(collectible.owned, 10);
  if (isNaN(owned) || !isFinite(maxOwned) || maxOwned === 0) return 0;
  return (owned / maxOwned) * 100;
}

export function favoriteOptions(
  ownedIds: number[] | undefined,
  collectiblesById: Record<string, Collectible> | undefined,
): FavoriteCollectibleOption[] {
  if (!collectiblesById) return [];
  return (ownedIds ?? [])
    .map((id) => collectiblesById[String(id)])
    .filter(isCollectible)
    .map((item) => ({
      id: item.id,
      name: item.name,
      icon: item.icon ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function favoriteById(
  id: number | null | undefined,
  collectiblesById: Record<string, Collectible> | undefined,
): Collectible | null {
  if (!id || !collectiblesById) return null;
  const item = collectiblesById[String(id)];
  return isCollectible(item) ? item : null;
}
