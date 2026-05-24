import { useEffect, useState } from "react";
import { db, ref, get } from "@/lib/db";
import { COLLECTIBLE_KEYS } from "../collectibleConfig";
import type { CollectibleKey } from "../collectibleConfig";
import type {
  FCMember,
  MemberCacheData,
  Collectible,
  MemberWithMounts,
} from "../types";
import { isFriendRank } from "../hooks/useCollectionScope";

type AllCollectibles = Record<CollectibleKey, Collectible[]>;

interface FCCollectionState {
  members: FCMember[];
  allCollectibles: AllCollectibles;
  membersWithMounts: MemberWithMounts[];
  memberData: Record<string, MemberCacheData>;
  lastFetched: number | null;
  loading: boolean;
}

const CACHE_KEY = "fcc_collection_v3";
const CACHE_TTL = 3 * 60 * 60 * 1000;

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

function isCollectible(value: unknown): value is Collectible {
  return value != null && typeof value === "object" && "id" in value;
}

function normalizeAllCollectibles(
  raw: Partial<Record<CollectibleKey, unknown>>,
): AllCollectibles {
  const result = emptyAllCollectibles();
  for (const key of COLLECTIBLE_KEYS) {
    const value = raw[key];
    if (Array.isArray(value) || (value != null && typeof value === "object")) {
      result[key] = Object.values(value).filter(isCollectible);
    }
  }
  return result;
}

function buildMembersWithMounts(
  members: FCMember[],
  memberData: Record<string, MemberCacheData>,
): MemberWithMounts[] {
  return members.map((m) => {
    const cache = memberData[m.lodestoneId];
    const owned = Object.fromEntries(
      COLLECTIBLE_KEYS.map((key) => [key, toSet(cache?.owned?.[key])]),
    ) as Record<CollectibleKey, Set<number>>;
    const previousOwned = Object.fromEntries(
      COLLECTIBLE_KEYS.map((key) => [
        key,
        cache?.previousOwned?.[key]?.count ?? 0,
      ]),
    ) as Record<CollectibleKey, number>;
    return {
      id: m.id,
      name: m.name,
      lodestoneId: m.lodestoneId,
      fcRank: m.fcRank ?? null,
      isFriend: isFriendRank(m.fcRank),
      avatar: cache?.avatar ?? "",
      owned,
      previousOwned,
    };
  });
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
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as CachePayload;
        if (Date.now() - cached.timestamp < CACHE_TTL) {
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
        localStorage.removeItem(CACHE_KEY);
      } catch {
        void CACHE_KEY;
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
        localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
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
