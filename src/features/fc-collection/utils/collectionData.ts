import { COLLECTIBLE_KEYS } from "../constants";
import type {
  AllCollectibles,
  Collectible,
  CollectibleKey,
  FCMember,
  MemberCacheData,
  MemberWithMounts,
} from "../types";
import { isFriendRank } from "./collectionScope";

export function emptyAllCollectibles(): AllCollectibles {
  const result = {} as AllCollectibles;
  for (const key of COLLECTIBLE_KEYS) result[key] = [];
  return result;
}

function toSet(raw: unknown): Set<number> {
  if (!raw) return new Set();
  const arr: number[] = Array.isArray(raw) ? raw : Object.values(raw as object);
  return new Set(arr);
}

function isCollectible(value: unknown): value is Collectible {
  return value != null && typeof value === "object" && "id" in value;
}

export function normalizeAllCollectibles(
  raw: Partial<Record<CollectibleKey, unknown>>,
): AllCollectibles {
  const result = emptyAllCollectibles();
  for (const key of COLLECTIBLE_KEYS) {
    const value = raw[key];
    if (Array.isArray(value) || (value != null && typeof value === "object")) {
      result[key] = Object.values(value).filter(isCollectible);
    }
  }
  return result;
}

export function buildMembersWithMounts(
  members: FCMember[],
  memberData: Record<string, MemberCacheData>,
): MemberWithMounts[] {
  return members.map((m) => {
    const cache = memberData[m.lodestoneId];
    const owned = Object.fromEntries(
      COLLECTIBLE_KEYS.map((key) => [key, toSet(cache?.owned?.[key])]),
    ) as Record<CollectibleKey, Set<number>>;
    const previousOwned = Object.fromEntries(
      COLLECTIBLE_KEYS.map((key) => [
        key,
        cache?.previousOwned?.[key]?.count ?? 0,
      ]),
    ) as Record<CollectibleKey, number>;
    return {
      id: m.id,
      name: m.name,
      lodestoneId: m.lodestoneId,
      fcRank: m.fcRank ?? null,
      isFriend: isFriendRank(m.fcRank),
      avatar: cache?.avatar ?? "",
      owned,
      previousOwned,
    };
  });
}
