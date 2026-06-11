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
  localStorage.removeItem("fcc_collection_v3");
  localStorage.removeItem("fcc_collectibles_v1");
}
