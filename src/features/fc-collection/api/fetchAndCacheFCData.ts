import { db, ref, set } from "@/lib/db";
import { COLLECTIBLE_CONFIG, COLLECTIBLE_KEYS } from "../collectibleConfig";
import type { CollectibleKey } from "../collectibleConfig";
import type { FCMember, MemberCacheData, Collectible } from "../types";

const BASE = "https://ffxivcollect.com/api";

function parseOwned(json: unknown): number[] {
  if (!json) return [];
  const arr = Array.isArray(json) ? json : ((json as any)?.results ?? []);
  return (arr as Collectible[]).map((item) => item.id);
}

export async function fetchAndCacheFCData(
  members: FCMember[],
  previousMemberData: Record<string, MemberCacheData> = {},
): Promise<void> {
  const listResults = await Promise.all(
    COLLECTIBLE_CONFIG.map((cfg) => fetch(`${BASE}/${cfg.apiPath}`)),
  );

  for (let i = 0; i < listResults.length; i++) {
    if (!listResults[i].ok) {
      throw new Error(`Failed to fetch ${COLLECTIBLE_CONFIG[i].label} list`);
    }
  }

  const listJsons = await Promise.all(listResults.map((r) => r.json()));
  const lists: Record<string, string> = {};
  for (let i = 0; i < COLLECTIBLE_CONFIG.length; i++) {
    const cfg = COLLECTIBLE_CONFIG[i];
    const items: Collectible[] = listJsons[i]?.results ?? [];
    lists[cfg.apiPath] = JSON.stringify(items);
  }

  const memberResults = await Promise.all(
    members.map(async (member) => {
      const prev = previousMemberData[member.lodestoneId];
      try {
        const [charRes, ...ownedResponses] = await Promise.all([
          fetch(`${BASE}/characters/${member.lodestoneId}`),
          ...COLLECTIBLE_CONFIG.map((cfg) =>
            fetch(`${BASE}/characters/${member.lodestoneId}/${cfg.apiPath}/owned`),
          ),
        ]);

        const avatar = charRes.ok
          ? ((await charRes.json()).avatar ?? "")
          : (prev?.avatar ?? "");

        const ownedJsons = await Promise.all(
          ownedResponses.map((r, i) => {
            if (!r.ok) {
              console.warn(`[fetchAndCacheFCData] ${member.lodestoneId} ${COLLECTIBLE_CONFIG[i].apiPath}/owned → HTTP ${r.status}`);
              return null;
            }
            return r.json();
          }),
        );

        const owned = {} as Record<CollectibleKey, number[]>;
        const previousOwned = {} as Record<CollectibleKey, number>;
        for (let i = 0; i < COLLECTIBLE_CONFIG.length; i++) {
          const key = COLLECTIBLE_CONFIG[i].key; // always use cfg.key, never rely on index sync with COLLECTIBLE_KEYS
          owned[key] = parseOwned(ownedJsons[i]);
          previousOwned[key] = prev?.owned?.[key]?.length ?? 0;
          console.log(`[fetchAndCacheFCData] ${member.lodestoneId} ${key}: ${owned[key].length} owned`);
        }

        const data: MemberCacheData = {
          avatar,
          owned,
          previousOwned,
          lastFetched: Date.now(),
        };
        return { lodestoneId: member.lodestoneId, data };
      } catch (err) {
        console.error(`[fetchAndCacheFCData] ${member.lodestoneId} fetch failed:`, err);
        const owned = {} as Record<CollectibleKey, number[]>;
        const previousOwned = {} as Record<CollectibleKey, number>;
        for (const key of COLLECTIBLE_KEYS) {
          owned[key] = prev?.owned?.[key] ?? [];
          previousOwned[key] = prev?.previousOwned?.[key] ?? 0;
        }
        const data: MemberCacheData = {
          avatar: prev?.avatar ?? "",
          owned,
          previousOwned,
          lastFetched: prev?.lastFetched ?? 0,
        };
        return { lodestoneId: member.lodestoneId, data };
      }
    }),
  );

  const memberData: Record<string, MemberCacheData> = {};
  for (const { lodestoneId, data } of memberResults) {
    memberData[lodestoneId] = data;
  }

  await set(ref(db, "fcCollection/cache"), {
    lastFetched: Date.now(),
    ...lists,
    memberData,
  });
}
