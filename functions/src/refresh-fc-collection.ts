import * as admin from "firebase-admin";

const BASE = "https://ffxivcollect.com/api";

// Stripped-down collectible config (no LucideIcon — UI only)
const COLLECTIBLE_CONFIG = [
  { key: "mounts",       apiPath: "mounts",       fetchLimit: undefined as number | undefined, categoryFilter: undefined as string[] | undefined },
  { key: "minions",      apiPath: "minions",       fetchLimit: undefined,                        categoryFilter: undefined },
  { key: "titles",       apiPath: "titles",        fetchLimit: undefined,                        categoryFilter: undefined },
  {
    key: "achievements",
    apiPath: "achievements",
    fetchLimit: 5000,
    categoryFilter: [
      "Trials", "Raids", "Dungeons", "Duty", "Deep Dungeon Weapons", "Phantom Weapons",
      "Frontline", "The Wolves' Den",
      "Field Operations", "Treasure Hunt", "Gold Saucer",
      "Main Scenario", "General", "Allied Society Quests", "All Disciplines",
      "Carpenter", "Blacksmith", "Armorer", "Goldsmith", "Leatherworker", "Weaver", "Alchemist", "Culinarian", "Cosmic Tools",
      "Miner", "Botanist", "Fisher",
    ],
  },
] as const;

type CollectibleKey = typeof COLLECTIBLE_CONFIG[number]["key"];

interface FCMember {
  name: string;
  lodestoneId: string;
}

interface MemberCacheData {
  avatar: string;
  owned: Record<CollectibleKey, number[]>;
  previousOwned: Record<CollectibleKey, number>;
  lastFetched: number;
}

function parseOwned(json: unknown): number[] {
  if (!json) return [];
  const arr = Array.isArray(json) ? json : ((json as { results?: unknown[] })?.results ?? []);
  return (arr as { id: number }[]).map((item) => item.id);
}

function transformItems(rawItems: Record<string, unknown>[], categoryFilter?: readonly string[]): Record<string, unknown>[] {
  const filtered = categoryFilter?.length
    ? rawItems.filter((item) => categoryFilter.includes((item.category as { name?: string })?.name ?? ""))
    : rawItems;
  return filtered.map((item) => ({
    ...item,
    sources: item.category
      ? [{ type: (item.category as { name: string }).name, text: (item.type as { name?: string })?.name ?? "" }]
      : (item.sources ?? []),
  }));
}

const FC_ID = "9235616198341716868";

export async function runRefreshFCCollection(): Promise<void> {
  const db = admin.database();

  try {
    await fetch(`https://ffxivcollect.com/api/v1/free_companies/${FC_ID}/refresh`, { method: "POST" });
  } catch {
    // Non-fatal: proceed with potentially stale ffxivcollect data
  }

  // 1. Read members and previous cache from RTDB
  const [membersSnap, cacheSnap] = await Promise.all([
    db.ref("fcCollection/members").get(),
    db.ref("fcCollection/cache").get(),
  ]);

  const membersVal = membersSnap.val() as Record<string, Omit<FCMember, "lodestoneId"> & { lodestoneId: string }> | null;
  const members: FCMember[] = membersVal
    ? Object.values(membersVal).map((m) => ({ name: m.name, lodestoneId: m.lodestoneId }))
    : [];

  const prevCache = (cacheSnap.val() ?? {}) as Record<string, unknown>;
  const prevMemberData = (prevCache.memberData ?? {}) as Record<string, MemberCacheData>;

  if (members.length === 0) {
    console.log("[fccollect] No members found in RTDB — skipping");
    return;
  }
  console.log(`[fccollect] ${members.length} members`);

  // 2. Fetch collectible lists
  const listResponses = await Promise.all(
    COLLECTIBLE_CONFIG.map((cfg) =>
      fetch(cfg.fetchLimit ? `${BASE}/${cfg.apiPath}?limit=${cfg.fetchLimit}` : `${BASE}/${cfg.apiPath}`),
    ),
  );
  for (let i = 0; i < listResponses.length; i++) {
    if (!listResponses[i].ok) throw new Error(`Failed to fetch ${COLLECTIBLE_CONFIG[i].key} list`);
  }
  const listJsons = await Promise.all(listResponses.map((r) => r.json() as Promise<{ results?: Record<string, unknown>[] }>));
  const lists: Record<string, string> = {};
  for (let i = 0; i < COLLECTIBLE_CONFIG.length; i++) {
    const cfg = COLLECTIBLE_CONFIG[i];
    const items = transformItems(listJsons[i]?.results ?? [], cfg.categoryFilter);
    lists[cfg.apiPath] = JSON.stringify(items);
  }

  // 3. Fetch per-member owned items (5 concurrent)
  const memberResults = await Promise.all(
    members.map(async (member) => {
      const prev = prevMemberData[member.lodestoneId];
      try {
        const [charRes, ...ownedResponses] = await Promise.all([
          fetch(`${BASE}/characters/${member.lodestoneId}`),
          ...COLLECTIBLE_CONFIG.map((cfg) =>
            fetch(`${BASE}/characters/${member.lodestoneId}/${cfg.apiPath}/owned`),
          ),
        ]);
        const avatar = charRes.ok ? (((await charRes.json()) as { avatar?: string }).avatar ?? "") : (prev?.avatar ?? "");
        const ownedJsons = await Promise.all(
          ownedResponses.map((r, i) => {
            if (!r.ok) {
              console.warn(`[fccollect] ${member.lodestoneId} ${COLLECTIBLE_CONFIG[i].apiPath}/owned → ${r.status}`);
              return Promise.resolve(null);
            }
            return r.json() as Promise<unknown>;
          }),
        );
        const owned = {} as Record<CollectibleKey, number[]>;
        const previousOwned = {} as Record<CollectibleKey, number>;
        for (let i = 0; i < COLLECTIBLE_CONFIG.length; i++) {
          const key = COLLECTIBLE_CONFIG[i].key;
          owned[key] = parseOwned(ownedJsons[i]);
          previousOwned[key] = prev?.owned?.[key]?.length ?? 0;
        }
        return { lodestoneId: member.lodestoneId, data: { avatar, owned, previousOwned, lastFetched: Date.now() } as MemberCacheData };
      } catch (err) {
        console.error(`[fccollect] ${member.lodestoneId} fetch failed:`, err);
        const owned = {} as Record<CollectibleKey, number[]>;
        const previousOwned = {} as Record<CollectibleKey, number>;
        for (const cfg of COLLECTIBLE_CONFIG) {
          owned[cfg.key] = prev?.owned?.[cfg.key] ?? [];
          previousOwned[cfg.key] = prev?.previousOwned?.[cfg.key] ?? 0;
        }
        return { lodestoneId: member.lodestoneId, data: { avatar: prev?.avatar ?? "", owned, previousOwned, lastFetched: prev?.lastFetched ?? 0 } as MemberCacheData };
      }
    }),
  );

  // 4. Write to RTDB
  const memberData: Record<string, MemberCacheData> = {};
  for (const { lodestoneId, data } of memberResults) {
    memberData[lodestoneId] = data;
  }

  await db.ref("fcCollection/cache").set({ lastFetched: Date.now(), ...lists, memberData });
  console.log(`[fccollect] cache written — ${members.length} members`);
}
