import * as admin from "firebase-admin";
import { memberSyncError, memberSyncSuccess } from "./member-sync-status";

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

type MemberFetchResult =
  | { data: MemberCacheData; refreshed: true }
  | { error: string; refreshed: false };

export interface CollectionRefreshSummary {
  total: number;
  refreshed: number;
  failed: number;
}

async function fetchJson(url: string): Promise<unknown> {
  for (let attempt = 0; ; attempt++) {
    let response: Response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    } catch (error) {
      if (attempt > 0) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500));
      continue;
    }
    if (response.ok) return response.json();

    await response.body?.cancel();
    const retryAfter = response.headers.get("retry-after");
    const delay = retryAfter == null ? 500 : /^\d+(\.\d+)?$/.test(retryAfter)
      ? Number(retryAfter) * 1000
      : Math.max(0, Date.parse(retryAfter) - Date.now());
    if (attempt === 0 && (response.status === 429 || response.status >= 500)
      && Number.isFinite(delay) && delay <= 5000) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }
    throw new Error(`${url.replace(BASE, "")} returned HTTP ${response.status}`);
  }
}

function parseItems(json: unknown): Record<string, unknown>[] {
  const items = Array.isArray(json) ? json : (json as { results?: unknown } | null)?.results;
  if (!Array.isArray(items) || items.some((item: unknown) =>
    item == null || typeof item !== "object" || !("id" in item)
      || !Number.isSafeInteger(item.id) || Number(item.id) <= 0)) {
    throw new Error("Unexpected collection response: expected an item list with numeric IDs.");
  }
  return items;
}

function parseOwned(json: unknown): number[] {
  return parseItems(json).map((item) => item.id as number);
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
    // Settle every request before releasing this member's concurrency slot.
    const [character, ...ownedResults] = await Promise.allSettled([
      fetchJson(`${BASE}/characters/${lodestoneId}`),
      ...COLLECTIBLE_CONFIG.map((cfg) =>
        fetchJson(`${BASE}/characters/${lodestoneId}/${cfg.apiPath}/owned`).then(parseOwned),
      ),
    ]);
    const profile = character.status === "fulfilled" ? character.value as { avatar?: unknown } | null : null;
    const avatar = typeof profile?.avatar === "string" ? profile.avatar : (prev?.avatar ?? "");
    const owned = {} as Record<CollectibleKey, number[]>;
    const previousOwned = {} as Record<CollectibleKey, PreviousOwnedEntry>;
    for (let i = 0; i < COLLECTIBLE_CONFIG.length; i++) {
      const key = COLLECTIBLE_CONFIG[i].key;
      const result = ownedResults[i];
      if (result.status === "rejected") throw result.reason;
      owned[key] = result.value as number[];
      previousOwned[key] = { count: prev?.owned?.[key]?.length ?? 0, asOf: prev?.lastFetched ?? now };
    }
    return { data: { avatar, owned, previousOwned, lastFetched: Date.now() }, refreshed: true };
  } catch (err) {
    console.error(`[fccollect] ${lodestoneId} fetch failed:`, err);
    return {
      error: err instanceof Error ? err.message : "Collection refresh failed.",
      refreshed: false,
    };
  }
}

export async function runRefreshFCCollectionMember(lodestoneId: string): Promise<void> {
  const db = admin.database();
  const prev = ((await db.ref(`fcCollection/memberData/${lodestoneId}`).get()).val() ?? undefined) as
    | MemberCacheData
    | undefined;
  const result = await fetchMemberCollectionData(lodestoneId, prev);
  if (!result.refreshed) {
    if (prev) await db.ref(`fcCollection/memberData/${lodestoneId}/lastError`).set(result.error);
    throw new Error(result.error);
  }
  await db.ref(`fcCollection/memberData/${lodestoneId}`).set(result.data);
  console.log(`[fccollect] written member ${lodestoneId}`);
}

export async function runRefreshFCCollection(): Promise<CollectionRefreshSummary> {
  const db = admin.database();

  try {
    const response = await fetch(`https://ffxivcollect.com/api/v1/free_companies/${FC_ID}/refresh`, {
      method: "POST", signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) console.warn(`[fccollect] FC refresh returned HTTP ${response.status}`);
    await response.body?.cancel();
  } catch (error) {
    console.warn("[fccollect] FC refresh request failed", error);
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
    return { total: 0, refreshed: 0, failed: 0 };
  }
  console.log(`[fccollect] ${lodestoneIds.length} members`);

  // 2. Fetch collectible lists
  const listItems = await Promise.all(
    COLLECTIBLE_CONFIG.map((cfg) =>
      fetchJson(cfg.fetchLimit ? `${BASE}/${cfg.apiPath}?limit=${cfg.fetchLimit}` : `${BASE}/${cfg.apiPath}`).then(parseItems),
    ),
  );

  // Store collectibles as real objects keyed by item id (not JSON strings)
  const collectiblesUpdate: Record<string, unknown> = {
    "fcCollection/collectibles/lastFetched": Date.now(),
  };
  for (let i = 0; i < COLLECTIBLE_CONFIG.length; i++) {
    const cfg = COLLECTIBLE_CONFIG[i];
    const items = transformItems(listItems[i], cfg.categoryFilter);
    if (items.length === 0) throw new Error(`Empty ${cfg.key} catalog returned.`);
    const byId: Record<string, unknown> = {};
    for (const item of items) {
      byId[String((item as { id: number }).id)] = item;
    }
    collectiblesUpdate[`fcCollection/collectibles/${cfg.key}`] = byId;
  }

  // Three members at a time, with at most five requests each.
  let nextMember = 0;
  const summary = { total: lodestoneIds.length, refreshed: 0, failed: 0 };
  const memberDataUpdate: Record<string, unknown> = { ...collectiblesUpdate };
  await Promise.all(Array.from({ length: Math.min(3, lodestoneIds.length) }, async () => {
    while (nextMember < lodestoneIds.length) {
      const lodestoneId = lodestoneIds[nextMember++];
      const attemptAt = Date.now();
      const prev = prevMemberData[lodestoneId];
      const result = await fetchMemberCollectionData(lodestoneId, prev);
      if (result.refreshed) {
        summary.refreshed++;
        memberDataUpdate[`fcCollection/memberData/${lodestoneId}`] = result.data;
        memberDataUpdate[`memberSyncStatus/${lodestoneId}/collection`] = memberSyncSuccess(
          "collection", attemptAt, result.data.lastFetched,
        );
      } else {
        summary.failed++;
        if (prev) memberDataUpdate[`fcCollection/memberData/${lodestoneId}/lastError`] = result.error;
        memberDataUpdate[`memberSyncStatus/${lodestoneId}/collection`] = {
          ...memberSyncError(attemptAt, result.error),
          ...(prev?.lastFetched ? { lastSuccessAt: prev.lastFetched } : {}),
        };
      }
    }
  }));

  await db.ref("/").update(memberDataUpdate);
  console.log("[fccollect] refresh completed", summary);
  return summary;
}
