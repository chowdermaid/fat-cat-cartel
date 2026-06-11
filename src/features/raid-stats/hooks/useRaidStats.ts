import { useEffect, useState } from "react";
import { loadCachedZone, saveCachedZone } from "../api/raidStatsCache";
import { fetchRaidStatsZone, fetchRaidStatsZoneLastUpdated } from "../api/raidStatsFetchers";
import type { ZoneData } from "../types";

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
      fetchRaidStatsZone(zoneId).then((result) => {
        if (cancelled) return;
        setData(result);
        setLoading(false);
        if (result) {
          saveCachedZone(zoneId, result);
        }
      });

    const request = cached
      ? fetchRaidStatsZoneLastUpdated(zoneId).then((serverLastUpdated) => {
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
