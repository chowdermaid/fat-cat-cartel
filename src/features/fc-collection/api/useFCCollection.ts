import { useEffect, useState } from "react";
import { db, ref, onValue } from "@/lib/db";
import type { FCMember, MemberCacheData, Mount, MemberWithMounts } from "../types";

interface FCCollectionState {
  members: FCMember[];
  allMounts: Mount[];
  membersWithMounts: MemberWithMounts[];
  memberData: Record<string, MemberCacheData>;
  lastFetched: number | null;
  loading: boolean;
}

export function useFCCollection(): FCCollectionState {
  const [members, setMembers] = useState<FCMember[]>([]);
  const [allMounts, setAllMounts] = useState<Mount[]>([]);
  const [memberData, setMemberData] = useState<Record<string, MemberCacheData>>({});
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  const [membersLoaded, setMembersLoaded] = useState(false);
  const [cacheLoaded, setCacheLoaded] = useState(false);

  useEffect(() => {
    const unsubMembers = onValue(ref(db, "fcCollection/members"), (snap: any) => {
      const val = snap.val();
      setMembers(
        val
          ? Object.entries(val).map(([id, data]) => ({
              id,
              ...(data as Omit<FCMember, "id">),
            }))
          : []
      );
      setMembersLoaded(true);
    });

    const unsubCache = onValue(ref(db, "fcCollection/cache"), (snap: any) => {
      const val = snap.val();
      console.log("[cache] raw val keys:", val ? Object.keys(val) : null);
      if (val) {
        const md = val.memberData ?? {};
        const firstKey = Object.keys(md)[0];
        if (firstKey) {
          const entry = md[firstKey];
          const raw = entry?.ownedMountIds;
          console.log(`[cache] member "${firstKey}" ownedMountIds:`, raw, "isArray:", Array.isArray(raw), "length:", Array.isArray(raw) ? raw.length : Object.keys(raw ?? {}).length);
        }
        setAllMounts(val.mounts ? JSON.parse(val.mounts) : []);
        setMemberData(md);
        setLastFetched(val.lastFetched ?? null);
      }
      setCacheLoaded(true);
    });

    return () => {
      unsubMembers();
      unsubCache();
    };
  }, []);

  const membersWithMounts: MemberWithMounts[] = members.map((m) => {
    const cache = memberData[m.lodestoneId];
    const raw = cache?.ownedMountIds;
    const ids: number[] = !raw ? [] : Array.isArray(raw) ? raw : Object.values(raw);
    const ownedSet = new Set<number>(ids);
    console.log(`[membersWithMounts] ${m.name} lodestoneId="${m.lodestoneId}" cacheFound=${!!cache} rawType=${Array.isArray(raw) ? "array" : typeof raw} setSize=${ownedSet.size} sampleIds=${ids.slice(0, 3)}`);
    return {
      id: m.id,
      name: m.name,
      lodestoneId: m.lodestoneId,
      avatar: cache?.avatar ?? "",
      ownedMountIds: ownedSet,
      previousCount: cache?.previousCount ?? 0,
    };
  });

  return {
    members,
    allMounts,
    membersWithMounts,
    memberData,
    lastFetched,
    loading: !membersLoaded || !cacheLoaded,
  };
}
