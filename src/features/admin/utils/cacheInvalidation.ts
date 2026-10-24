import { invalidateCollectionCache } from "@/features/fc-collection/utils/collectionCache";

export function clearRaidStatsCache() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith("fcc_raidstats_")) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    return;
  }
}

export function clearMembersCache() {
  localStorage.removeItem("fcc_members_v3");
}

export function clearCollectionCache() {
  invalidateCollectionCache();
}
