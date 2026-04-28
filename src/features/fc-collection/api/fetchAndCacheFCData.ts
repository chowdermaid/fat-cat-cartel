import { db, ref, set } from "@/lib/db";
import type { FCMember, MemberCacheData, Mount } from "../types";

const BASE = "https://ffxivcollect.com/api";

export async function fetchAndCacheFCData(
  members: FCMember[],
  previousMemberData: Record<string, MemberCacheData> = {},
): Promise<void> {
  const mountsRes = await fetch(`${BASE}/mounts`);
  if (!mountsRes.ok) throw new Error("Failed to fetch mount list");
  const mountsJson = await mountsRes.json();
  const mounts: Mount[] = mountsJson.results;

  const memberResults = await Promise.all(
    members.map(async (member) => {
      const prev = previousMemberData[member.lodestoneId];
      try {
        const [charRes, ownedRes] = await Promise.all([
          fetch(`${BASE}/characters/${member.lodestoneId}`),
          fetch(`${BASE}/characters/${member.lodestoneId}/mounts/owned`),
        ]);

        const avatar = charRes.ok
          ? ((await charRes.json()).avatar ?? "")
          : (prev?.avatar ?? "");
        const ownedJson = ownedRes.ok ? await ownedRes.json() : null;
        const ownedList: Mount[] = Array.isArray(ownedJson)
          ? ownedJson
          : (ownedJson?.results ?? []);
        const ownedMountIds: number[] = ownedList.map((m) => m.id);

        const data: MemberCacheData = {
          avatar,
          ownedMountIds,
          previousCount: prev?.ownedMountIds?.length ?? 0,
          lastFetched: Date.now(),
        };
        return { lodestoneId: member.lodestoneId, data };
      } catch {
        const data: MemberCacheData = {
          avatar: prev?.avatar ?? "",
          ownedMountIds: prev?.ownedMountIds ?? [],
          previousCount: prev?.previousCount ?? 0,
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
    mounts: JSON.stringify(mounts),
    memberData,
  });
}
