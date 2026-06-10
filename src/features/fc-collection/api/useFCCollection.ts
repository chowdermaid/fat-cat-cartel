import { useEffect, useState } from "react";
import { db, ref, get } from "@/lib/db";
import { FC_COLLECTION_CACHE_KEY, FC_COLLECTION_CACHE_TTL } from "../constants";
import type {
  AllCollectibles,
  Collectible,
  CollectibleKey,
  FCCollectionState,
  FCMember,
  MemberCacheData,
} from "../types";
import {
  buildMembersWithMounts,
  emptyAllCollectibles,
  normalizeAllCollectibles,
} from "../utils/collectionData";

type MembersValue = Record<
  string,
  { name: string; avatarUrl?: string; fcRank?: string | null }
>;
type CollectiblesValue = Record<
  string,
  Record<string, Collectible | null> | Array<Collectible | null>
>;

interface DbSnapshot<T> {
  val(): T | null;
}

interface CachePayload {
  members: FCMember[];
  allCollectibles: Record<CollectibleKey, Collectible[]>;
  memberData: Record<string, MemberCacheData>;
  lastFetched: number | null;
  timestamp: number;
}

export function useFCCollection(): FCCollectionState {
  const [members, setMembers] = useState<FCMember[]>([]);
  const [allCollectibles, setAllCollectibles] =
    useState<AllCollectibles>(emptyAllCollectibles);
  const [memberData, setMemberData] = useState<Record<string, MemberCacheData>>(
    {},
  );
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage first
    try {
      const raw = localStorage.getItem(FC_COLLECTION_CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as CachePayload;
        if (Date.now() - cached.timestamp < FC_COLLECTION_CACHE_TTL) {
          const id = window.setTimeout(() => {
            setMembers(cached.members);
            setAllCollectibles(normalizeAllCollectibles(cached.allCollectibles));
            setMemberData(cached.memberData);
            setLastFetched(cached.lastFetched);
            setLoading(false);
          }, 0);
          return () => window.clearTimeout(id);
        }
      }
    } catch {
      try {
        localStorage.removeItem(FC_COLLECTION_CACHE_KEY);
      } catch {
        void FC_COLLECTION_CACHE_KEY;
      }
    }

    Promise.all([
      get(ref(db, "members")) as Promise<DbSnapshot<MembersValue>>,
      get(ref(db, "fcCollection/collectibles")) as Promise<DbSnapshot<CollectiblesValue>>,
      get(ref(db, "fcCollection/memberData")) as Promise<DbSnapshot<Record<string, MemberCacheData>>>,
    ]).then(([membersSnap, collectiblesSnap, memberDataSnap]) => {
      const membersVal = membersSnap.val() ?? {};
      const newMembers: FCMember[] = Object.entries(membersVal).map(
        ([lodestoneId, m]) => ({
          id: lodestoneId,
          name: m.name,
          lodestoneId,
          fcRank: m.fcRank ?? null,
        }),
      );

      // collectibles stored as real objects keyed by item id
      const collectiblesVal = collectiblesSnap.val() ?? {};
      const newCollectibles = normalizeAllCollectibles(collectiblesVal);

      const newMemberData = (memberDataSnap.val() ?? {}) as Record<
        string,
        MemberCacheData
      >;
      const newLastFetched =
        (collectiblesSnap.val() as { lastFetched?: number } | null)
          ?.lastFetched ?? null;

      setMembers(newMembers);
      setAllCollectibles(newCollectibles);
      setMemberData(newMemberData);
      setLastFetched(newLastFetched);
      setLoading(false);

      const payload: CachePayload = {
        members: newMembers,
        allCollectibles: newCollectibles,
        memberData: newMemberData,
        lastFetched: newLastFetched,
        timestamp: Date.now(),
      };
      try {
        localStorage.setItem(FC_COLLECTION_CACHE_KEY, JSON.stringify(payload));
      } catch {
        return;
      }
    });
  }, []);

  const membersWithMounts = buildMembersWithMounts(members, memberData);

  return {
    members,
    allCollectibles,
    membersWithMounts,
    memberData,
    lastFetched,
    loading,
  };
}
