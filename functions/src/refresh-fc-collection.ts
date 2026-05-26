import * as admin from "firebase-admin";
import { memberSyncSuccess } from "./member-sync-status";

const BASE = "https://ffxivcollect.com/api";

const COLLECTIBLE_CONFIG = [
  { key: "mounts",       apiPath: "mounts",        fetchLimit: undefined as number | undefined, categoryFilter: undefined as string[] | undefined },
  { key: "minions",      apiPath: "minions",        fetchLimit: undefined,                        categoryFilter: undefined },
  { key: "titles",       apiPath: "titles",         fetchLimit: undefined,                        categoryFilter: undefined },
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

interface PreviousOwnedEntry {
  count: number;
  asOf: number;
}

interface MemberCacheData {
  avatar: string;
  owned: Record<CollectibleKey, number[]>;
  previousOwned: Record<CollectibleKey, PreviousOwnedEntry>;
  lastFetched: number;
}

interface MemberFetchResult {
  data: MemberCacheData;
  refreshed: boolean;
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

async function fetchMemberCollectionData(
  lodestoneId: string,
  prev: MemberCacheData | undefined,
): Promise<MemberFetchResult> {
  const now = Date.now();
  try {
    const [charRes, ...ownedResponses] = await Promise.all([
      fetch(`${BASE}/characters/${lodestoneId}`),
      ...COLLECTIBLE_CONFIG.map((cfg) =>
        fetch(`${BASE}/characters/${lodestoneId}/${cfg.apiPath}/owned`),
      ),
    ]);
    const avatar = charRes.ok ? (((await charRes.json()) as { avatar?: string }).avatar ?? "") : (prev?.avatar ?? "");
    const ownedJsons = await Promise.all(
      ownedResponses.map((r, i) => {
        if (!r.ok) {
          console.warn(`[fccollect] ${lodestoneId} ${COLLECTIBLE_CONFIG[i].apiPath}/owned -> ${r.status}`);
          return Promise.resolve(null);
        }
        return r.json() as Promise<unknown>;
      }),
    );
    const owned = {} as Record<CollectibleKey, number[]>;
    const previousOwned = {} as Record<CollectibleKey, PreviousOwnedEntry>;
    for (let i = 0; i < COLLECTIBLE_CONFIG.length; i++) {
      const key = COLLECTIBLE_CONFIG[i].key;
      owned[key] = parseOwned(ownedJsons[i]);
      previousOwned[key] = { count: prev?.owned?.[key]?.length ?? 0, asOf: prev?.lastFetched ?? now };
    }
    return { data: { avatar, owned, previousOwned, lastFetched: now }, refreshed: true };
  } catch (err) {
    console.error(`[fccollect] ${lodestoneId} fetch failed:`, err);
    const owned = {} as Record<CollectibleKey, number[]>;
    const previousOwned = {} as Record<CollectibleKey, PreviousOwnedEntry>;
    for (const cfg of COLLECTIBLE_CONFIG) {
      owned[cfg.key] = prev?.owned?.[cfg.key] ?? [];
      previousOwned[cfg.key] = prev?.previousOwned?.[cfg.key] ?? { count: 0, asOf: now };
    }
    return {
      data: { avatar: prev?.avatar ?? "", owned, previousOwned, lastFetched: prev?.lastFetched ?? 0 },
      refreshed: false,
    };
  }
}

export async function runRefreshFCCollectionMember(lodestoneId: string): Promise<void> {
  const db = admin.database();
  const prev = ((await db.ref(`fcCollection/memberData/${lodestoneId}`).get()).val() ?? undefined) as
    | MemberCacheData
    | undefined;
  const { data } = await fetchMemberCollectionData(lodestoneId, prev);
  await db.ref(`fcCollection/memberData/${lodestoneId}`).set(data);
  console.log(`[fccollect] written member ${lodestoneId}`);
}

export async function runRefreshFCCollection(): Promise<void> {
  const db = admin.database();

  try {
    await fetch(`https://ffxivcollect.com/api/v1/free_companies/${FC_ID}/refresh`, { method: "POST" });
  } catch {
    // Non-fatal: proceed with potentially stale ffxivcollect data
  }

  // 1. Read members from /members (canonical source) and previous member data
  const [membersSnap, prevMemberDataSnap] = await Promise.all([
    db.ref("members").get(),
    db.ref("fcCollection/memberData").get(),
  ]);

  const membersVal = (membersSnap.val() ?? {}) as Record<string, { name: string; lodestoneId?: string }>;
  // members/ is keyed by lodestoneId
  const lodestoneIds = Object.keys(membersVal);

  const prevMemberData = (prevMemberDataSnap.val() ?? {}) as Record<string, MemberCacheData>;

  if (lodestoneIds.length === 0) {
    console.log("[fccollect] No members found in RTDB — skipping");
    return;
  }
  console.log(`[fccollect] ${lodestoneIds.length} members`);

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

  // Store collectibles as real objects keyed by item id (not JSON strings)
  const collectiblesUpdate: Record<string, unknown> = {
    "fcCollection/collectibles/lastFetched": Date.now(),
  };
  for (let i = 0; i < COLLECTIBLE_CONFIG.length; i++) {
    const cfg = COLLECTIBLE_CONFIG[i];
    const items = transformItems(listJsons[i]?.results ?? [], cfg.categoryFilter);
    const byId: Record<string, unknown> = {};
    for (const item of items) {
      byId[String((item as { id: number }).id)] = item;
    }
    collectiblesUpdate[`fcCollection/collectibles/${cfg.key}`] = byId;
  }

  // 3. Fetch per-member owned items (all concurrent)
  const memberResults = await Promise.all(
    lodestoneIds.map(async (lodestoneId) => {
      const attemptAt = Date.now();
      const prev = prevMemberData[lodestoneId];
      return { lodestoneId, attemptAt, ...(await fetchMemberCollectionData(lodestoneId, prev)) };
    }),
  );

  // 4. Write collectibles and member data atomically
  const memberDataUpdate: Record<string, unknown> = { ...collectiblesUpdate };
  for (const { lodestoneId, attemptAt, data, refreshed } of memberResults) {
    memberDataUpdate[`fcCollection/memberData/${lodestoneId}`] = data;
    if (refreshed && data.lastFetched > 0) {
      memberDataUpdate[`memberSyncStatus/${lodestoneId}/collection`] = memberSyncSuccess(
        "collection",
        attemptAt,
        data.lastFetched,
        "collection refreshed.",
      );
    }
  }

  await db.ref("/").update(memberDataUpdate);
  console.log(`[fccollect] written collectibles + ${lodestoneIds.length} members`);
}
