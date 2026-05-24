import { useEffect, useState } from "react";
import { db, ref, get } from "@/lib/db";
import type { Member } from "@/types";
import type { MemberProfile } from "../types";
import type { Collectible, MemberCacheData } from "@/features/fc-collection/types";
import { ZONE_TABS } from "@/features/raid-stats/zones";
import type { ParseEntry, TomestoneActivity, ZoneData, ZoneMeta } from "@/features/raid-stats/types";

const PROFILE_ZONE_IDS = ZONE_TABS
  .filter((tab) => tab.type === "savage" || tab.type === "trial" || tab.type === "alliance")
  .flatMap((tab) => tab.zones.map((zone) => zone.id));
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
  raidZones: ZoneData[];
  recentActivity: TomestoneActivity[];
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

function normalizeCollectibles(
  raw: Record<string, Collectible | null> | Array<Collectible | null> | null,
): Record<string, Collectible> {
  const result: Record<string, Collectible> = {};
  for (const item of Object.values(raw ?? {})) {
    if (item != null && typeof item === "object" && "id" in item) {
      result[String(item.id)] = item;
    }
  }
  return result;
}

export function useMemberProfile(lodestoneId: string): MemberProfileState {
  const [member, setMember] = useState<Member | null>(null);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [collectionData, setCollectionData] = useState<MemberCacheData | null>(null);
  const [collectibles, setCollectibles] = useState<CollectiblesData | null>(null);
  const [parseEntry, setParseEntry] = useState<ParseEntry | null>(null);
  const [zoneMeta, setZoneMeta] = useState<ZoneMeta | null>(null);
  const [raidZones, setRaidZones] = useState<ZoneData[]>([]);
  const [recentActivity, setRecentActivity] = useState<TomestoneActivity[]>([]);
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
    setRaidZones([]);
    setRecentActivity([]);

    const cachedCollectibles = loadCollectiblesCache();
    const collectiblesPromise: Promise<CollectiblesData | null> = cachedCollectibles
      ? Promise.resolve(cachedCollectibles)
      : Promise.all([
          get(ref(db, "fcCollection/collectibles/mounts")),
          get(ref(db, "fcCollection/collectibles/minions")),
        ]).then(([mountsSnap, minionsSnap]: any[]) => {
          const data: CollectiblesData = {
            mounts: normalizeCollectibles(mountsSnap.val()),
            minions: normalizeCollectibles(minionsSnap.val()),
          };
          try {
            localStorage.setItem(COLLECTIBLES_CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
          } catch {}
          return data;
        }).catch(() => null);

    const raidZonesPromise = Promise.all(
      PROFILE_ZONE_IDS.map((zoneId) => get(ref(db, `raidStats/zones/${zoneId}`))),
    ).then((snaps: any[]) => snaps.map((snap) => snap.val()).filter(Boolean) as ZoneData[]);

    Promise.all([
      get(ref(db, `members/${lodestoneId}`)),
      get(ref(db, `memberProfiles/${lodestoneId}`)),
      get(ref(db, `fcCollection/memberData/${lodestoneId}`)),
      get(ref(db, `memberActivity/${lodestoneId}/tomestone/recent`)),
      collectiblesPromise,
      raidZonesPromise,
    ]).then(([memberSnap, profileSnap, collectionSnap, activitySnap, collectiblesData, zonesData]: any[]) => {
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
      const zones = zonesData as ZoneData[];
      setRaidZones(zones);
      const defaultZone = zones.find((zone) => zone.meta.id === 73) ?? zones[0] ?? null;
      setParseEntry(defaultZone?.parses?.[lodestoneId] ?? null);
      setZoneMeta(defaultZone?.meta ?? null);
      setRecentActivity(Object.values((activitySnap.val() ?? {}) as Record<string, TomestoneActivity>));
      setLoading(false);
    }).catch(() => {
      setNotFound(true);
      setLoading(false);
    });
  }, [lodestoneId]);

  return { member, profile, collectionData, collectibles, parseEntry, zoneMeta, raidZones, recentActivity, loading, notFound };
}
