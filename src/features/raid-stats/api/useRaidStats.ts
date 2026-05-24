import { useEffect, useState } from "react";
import { db, ref, get } from "@/lib/db";
import type { ZoneData } from "../types";

const CACHE_TTL = 3 * 60 * 60 * 1000;

function cacheKey(zoneId: number) {
  return `fcc_raidstats_v2_${zoneId}`;
}

function loadCachedZone(zoneId: number): ZoneData | null {
  try {
    const raw = localStorage.getItem(cacheKey(zoneId));
    if (!raw) return null;
    const { data: cached, timestamp } = JSON.parse(raw) as { data: ZoneData; timestamp: number };
    if (Date.now() - timestamp < CACHE_TTL) return cached;
  } catch {}
  return null;
}

interface RaidStatsState {
  data: ZoneData | null;
  loading: boolean;
}

export function useRaidStats(zoneId: number): RaidStatsState {
  const [data, setData] = useState<ZoneData | null>(() => loadCachedZone(zoneId));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const cached = loadCachedZone(zoneId);

    setData(cached);
    setLoading(!cached);

    const loadFullZone = () =>
      get(ref(db, `raidStats/zones/${zoneId}`)).then((snap: { val(): ZoneData | null }) => {
        if (cancelled) return;
        const result = snap.val();
        setData(result);
        setLoading(false);
        if (result) {
          localStorage.setItem(cacheKey(zoneId), JSON.stringify({ data: result, timestamp: Date.now() }));
        }
      });

    const request = cached
      ? get(ref(db, `raidStats/zones/${zoneId}/lastUpdated`)).then((snap: { val(): number | null }) => {
          const serverLastUpdated = snap.val();
          if (serverLastUpdated != null && serverLastUpdated <= cached.lastUpdated) {
            if (!cancelled) setLoading(false);
            return;
          }
          return loadFullZone();
        })
      : loadFullZone();

    request.catch(() => {
      if (cancelled) return;
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [zoneId]);

  return { data, loading };
}
