import { useEffect, useState } from "react";
import { db, ref, onValue } from "@/lib/db";
import { COLLECTIBLE_CONFIG, COLLECTIBLE_KEYS } from "../collectibleConfig";
import type { CollectibleKey } from "../collectibleConfig";
import type { FCMember, MemberCacheData, Collectible, MemberWithMounts } from "../types";

type AllCollectibles = Record<CollectibleKey, Collectible[]>;

interface FCCollectionState {
  members: FCMember[];
  allCollectibles: AllCollectibles;
  membersWithMounts: MemberWithMounts[];
  memberData: Record<string, MemberCacheData>;
  lastFetched: number | null;
  loading: boolean;
}

function emptyAllCollectibles(): AllCollectibles {
  const result = {} as AllCollectibles;
  for (const key of COLLECTIBLE_KEYS) result[key] = [];
  return result;
}

function toSet(raw: unknown): Set<number> {
  if (!raw) return new Set();
  const arr: number[] = Array.isArray(raw) ? raw : Object.values(raw as object);
  return new Set(arr);
}

export function useFCCollection(): FCCollectionState {
  const [members, setMembers] = useState<FCMember[]>([]);
  const [allCollectibles, setAllCollectibles] = useState<AllCollectibles>(emptyAllCollectibles);
  const [memberData, setMemberData] = useState<Record<string, MemberCacheData>>({});
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  const [membersLoaded, setMembersLoaded] = useState(false);
  const [cacheLoaded, setCacheLoaded] = useState(false);

  useEffect(() => {
    const unsubMembers = onValue(
      ref(db, "fcCollection/members"),
      (snap: any) => {
        const val = snap.val();
        setMembers(
          val
            ? Object.entries(val).map(([id, data]) => ({
                id,
                ...(data as Omit<FCMember, "id">),
              }))
            : [],
        );
        setMembersLoaded(true);
      },
    );

    const unsubCache = onValue(ref(db, "fcCollection/cache"), (snap: any) => {
      const val = snap.val();
      if (val) {
        const parsed = emptyAllCollectibles();
        for (const cfg of COLLECTIBLE_CONFIG) {
          parsed[cfg.key] = val[cfg.apiPath] ? JSON.parse(val[cfg.apiPath]) : [];
        }
        setAllCollectibles(parsed);
        setMemberData(val.memberData ?? {});
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
    const owned = Object.fromEntries(
      COLLECTIBLE_KEYS.map((key) => [key, toSet(cache?.owned?.[key])]),
    ) as Record<CollectibleKey, Set<number>>;
    const previousOwned = Object.fromEntries(
      COLLECTIBLE_KEYS.map((key) => [key, cache?.previousOwned?.[key] ?? 0]),
    ) as Record<CollectibleKey, number>;
    return {
      id: m.id,
      name: m.name,
      lodestoneId: m.lodestoneId,
      avatar: cache?.avatar ?? "",
      owned,
      previousOwned,
    };
  });

  return {
    members,
    allCollectibles,
    membersWithMounts,
    memberData,
    lastFetched,
    loading: !membersLoaded || !cacheLoaded,
  };
}
