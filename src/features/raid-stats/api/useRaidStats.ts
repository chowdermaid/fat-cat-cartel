import { useEffect, useState } from "react";
import { db, ref, get } from "@/lib/db";
import type { ZoneData } from "../types";

const CACHE_TTL = 3 * 60 * 60 * 1000;

function cacheKey(zoneId: number) {
  return `fcc_raidstats_v2_${zoneId}`;
}

interface RaidStatsState {
  data: ZoneData | null;
  loading: boolean;
}

export function useRaidStats(zoneId: number): RaidStatsState {
  const [data, setData] = useState<ZoneData | null>(() => {
    try {
      const raw = localStorage.getItem(cacheKey(zoneId));
      if (!raw) return null;
      const { data: cached, timestamp } = JSON.parse(raw) as { data: ZoneData; timestamp: number };
      if (Date.now() - timestamp < CACHE_TTL) return cached;
    } catch {}
    return null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setData(null);

    let fresh = false;
    try {
      const raw = localStorage.getItem(cacheKey(zoneId));
      if (raw) {
        const { data: cached, timestamp } = JSON.parse(raw) as { data: ZoneData; timestamp: number };
        if (Date.now() - timestamp < CACHE_TTL) {
          setData(cached);
          setLoading(false);
          fresh = true;
        }
      }
    } catch {}

    if (fresh) return;

    get(ref(db, `raidStats/zones/${zoneId}`)).then((snap: { val(): ZoneData | null }) => {
      const result = snap.val();
      setData(result);
      setLoading(false);
      if (result) {
        localStorage.setItem(cacheKey(zoneId), JSON.stringify({ data: result, timestamp: Date.now() }));
      }
    });
  }, [zoneId]);

  return { data, loading };
}
