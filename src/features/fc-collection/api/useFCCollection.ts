import { useEffect, useState } from "react";
import { db, ref, get } from "@/lib/db";
import { FC_COLLECTION_CACHE_EVENT, FC_COLLECTION_CACHE_KEY, FC_COLLECTION_CACHE_TTL } from "../constants";
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;
    let reloadQueued = false;
    let loadedAt = 0;
    let lastAttemptAt = 0;

    function apply(payload: CachePayload) {
      setMembers(payload.members);
      setAllCollectibles(normalizeAllCollectibles(payload.allCollectibles));
      setMemberData(payload.memberData);
      setLastFetched(payload.lastFetched);
      setError(null);
      setLoading(false);
      loadedAt = payload.timestamp;
    }

    async function load(force = false) {
      if (cancelled) return;
      if (force) loadedAt = 0;
      if (inFlight) {
        reloadQueued ||= force;
        return;
      }
      if (!force) {
        try {
          const raw = localStorage.getItem(FC_COLLECTION_CACHE_KEY);
          const cached = raw ? JSON.parse(raw) as CachePayload : null;
          if (cached && Array.isArray(cached.members) && cached.allCollectibles && cached.memberData
            && Number.isFinite(cached.timestamp)) {
            const fresh = Date.now() - cached.timestamp < FC_COLLECTION_CACHE_TTL;
            if (!loadedAt || (fresh && cached.timestamp !== loadedAt)) apply(cached);
            if (fresh) return;
          }
        } catch {
          // A blocked or invalid browser cache must not block Firebase reads.
        }
        if (loadedAt && Date.now() - loadedAt < FC_COLLECTION_CACHE_TTL) return;
        if (lastAttemptAt && Date.now() - lastAttemptAt < 30_000) return;
      }
      inFlight = true;
      lastAttemptAt = Date.now();
      try {
        const [membersSnap, collectiblesSnap, memberDataSnap] = await Promise.all([
          get(ref(db, "members")) as Promise<DbSnapshot<MembersValue>>,
          get(ref(db, "fcCollection/collectibles")) as Promise<DbSnapshot<CollectiblesValue>>,
          get(ref(db, "fcCollection/memberData")) as Promise<DbSnapshot<Record<string, MemberCacheData>>>,
        ]);
        if (cancelled || reloadQueued) return;
        const membersVal = membersSnap.val() ?? {};
        const newMembers: FCMember[] = Object.entries(membersVal).map(
          ([lodestoneId, m]) => ({
            id: lodestoneId,
            name: m.name,
            lodestoneId,
            fcRank: m.fcRank ?? null,
          }),
        );
        const payload: CachePayload = {
          members: newMembers,
          allCollectibles: normalizeAllCollectibles(collectiblesSnap.val() ?? {}),
          memberData: memberDataSnap.val() ?? {},
          lastFetched: (collectiblesSnap.val() as { lastFetched?: number } | null)?.lastFetched ?? null,
          timestamp: Date.now(),
        };
        apply(payload);
        try {
          localStorage.setItem(FC_COLLECTION_CACHE_KEY, JSON.stringify(payload));
        } catch {
          // The loaded snapshot is still usable without localStorage.
        }
      } catch {
        if (!cancelled && !reloadQueued) {
          setError("Unable to load collection data. Any previously loaded values are still shown.");
          setLoading(false);
        }
      } finally {
        inFlight = false;
        if (reloadQueued && !cancelled) {
          reloadQueued = false;
          void load(true);
        }
      }
    }

    const revalidate = () => {
      if (document.visibilityState !== "hidden") void load();
    };
    const invalidate = () => { void load(true); };
    const storageChanged = (event: StorageEvent) => {
      if (event.key === FC_COLLECTION_CACHE_KEY || event.key === null) {
        void load(event.newValue === null);
      }
    };
    const initialLoad = window.setTimeout(() => { void load(); }, 0);
    window.addEventListener("focus", revalidate);
    document.addEventListener("visibilitychange", revalidate);
    window.addEventListener(FC_COLLECTION_CACHE_EVENT, invalidate);
    window.addEventListener("storage", storageChanged);
    return () => {
      cancelled = true;
      window.clearTimeout(initialLoad);
      window.removeEventListener("focus", revalidate);
      document.removeEventListener("visibilitychange", revalidate);
      window.removeEventListener(FC_COLLECTION_CACHE_EVENT, invalidate);
      window.removeEventListener("storage", storageChanged);
    };
  }, []);

  const membersWithMounts = buildMembersWithMounts(members, memberData);

  return {
    members,
    allCollectibles,
    membersWithMounts,
    memberData,
    lastFetched,
    loading,
    error,
  };
}
