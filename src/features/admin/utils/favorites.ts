import type { FavoriteCollectibleOption } from "@/features/member-profile/FavoriteCollectiblePicker";
import type { Collectible } from "@/features/fc-collection/types";

function isCollectible(value: unknown): value is Collectible {
  return value != null && typeof value === "object" && "id" in value && "name" in value;
}

export function buildFavoriteOptions(
  ownedIds: number[] | undefined,
  collectiblesById: Record<string, Collectible>,
): FavoriteCollectibleOption[] {
  return (ownedIds ?? [])
    .map((id) => collectiblesById[String(id)])
    .filter(isCollectible)
    .map((item) => ({ id: item.id, name: item.name, icon: item.icon ?? null }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
