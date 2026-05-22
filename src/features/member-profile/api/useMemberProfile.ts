import { useEffect, useState } from "react";
import { db, ref, get } from "@/lib/db";
import type { Member } from "@/types";
import type { MemberProfile } from "../types";
import type { Collectible, MemberCacheData } from "@/features/fc-collection/types";
import type { ParseEntry, ZoneMeta } from "@/features/raid-stats/types";

const ZONE_ID = 73;
const COLLECTIBLES_CACHE_KEY = "fcc_collectibles_v1";
const COLLECTIBLES_TTL = 24 * 60 * 60 * 1000;

export interface CollectiblesData {
  mounts: Record<string, Collectible>;
  minions: Record<string, Collectible>;
}

interface MemberProfileState {
  member: Member | null;
  profile: MemberProfile | null;
  collectionData: MemberCacheData | null;
  collectibles: CollectiblesData | null;
  parseEntry: ParseEntry | null;
  zoneMeta: ZoneMeta | null;
  loading: boolean;
  notFound: boolean;
}

function loadCollectiblesCache(): CollectiblesData | null {
  try {
    const raw = localStorage.getItem(COLLECTIBLES_CACHE_KEY);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw) as { data: CollectiblesData; timestamp: number };
    if (Date.now() - timestamp < COLLECTIBLES_TTL) return data;
  } catch {}
  return null;
}

export function useMemberProfile(lodestoneId: string): MemberProfileState {
  const [member, setMember] = useState<Member | null>(null);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [collectionData, setCollectionData] = useState<MemberCacheData | null>(null);
  const [collectibles, setCollectibles] = useState<CollectiblesData | null>(null);
  const [parseEntry, setParseEntry] = useState<ParseEntry | null>(null);
  const [zoneMeta, setZoneMeta] = useState<ZoneMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    setMember(null);
    setProfile(null);
    setCollectionData(null);
    setCollectibles(null);
    setParseEntry(null);
    setZoneMeta(null);

    const cachedCollectibles = loadCollectiblesCache();
    const collectiblesPromise: Promise<CollectiblesData | null> = cachedCollectibles
      ? Promise.resolve(cachedCollectibles)
      : Promise.all([
          get(ref(db, "fcCollection/collectibles/mounts")),
          get(ref(db, "fcCollection/collectibles/minions")),
        ]).then(([mountsSnap, minionsSnap]: any[]) => {
          const data: CollectiblesData = {
            mounts: (mountsSnap.val() as Record<string, Collectible> | null) ?? {},
            minions: (minionsSnap.val() as Record<string, Collectible> | null) ?? {},
          };
          try {
            localStorage.setItem(COLLECTIBLES_CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
          } catch {}
          return data;
        }).catch(() => null);

    Promise.all([
      get(ref(db, `members/${lodestoneId}`)),
      get(ref(db, `memberProfiles/${lodestoneId}`)),
      get(ref(db, `fcCollection/memberData/${lodestoneId}`)),
      get(ref(db, `raidStats/zones/${ZONE_ID}/parses/${lodestoneId}`)),
      get(ref(db, `raidStats/zones/${ZONE_ID}/meta`)),
      collectiblesPromise,
    ]).then(([memberSnap, profileSnap, collectionSnap, parseSnap, metaSnap, collectiblesData]: any[]) => {
      const memberVal = memberSnap.val() as Member | null;
      if (!memberVal) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setMember(memberVal);
      setProfile(profileSnap.val() as MemberProfile | null);
      setCollectionData(collectionSnap.val() as MemberCacheData | null);
      setCollectibles(collectiblesData as CollectiblesData | null);
      setParseEntry(parseSnap.val() as ParseEntry | null);
      setZoneMeta(metaSnap.val() as ZoneMeta | null);
      setLoading(false);
    }).catch(() => {
      setNotFound(true);
      setLoading(false);
    });
  }, [lodestoneId]);

  return { member, profile, collectionData, collectibles, parseEntry, zoneMeta, loading, notFound };
}
