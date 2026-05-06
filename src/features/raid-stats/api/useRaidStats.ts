import { useEffect, useState } from "react";
import { db, ref, onValue } from "@/lib/db";
import type { ZoneData } from "../types";

interface RaidStatsState {
  data: ZoneData | null;
  loading: boolean;
}

export function useRaidStats(zoneId: number): RaidStatsState {
  const [data, setData] = useState<ZoneData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setData(null);
    const unsub = onValue(ref(db, `raidStats/zones/${zoneId}`), (snap: { val(): ZoneData | null }) => {
      setData(snap.val());
      setLoading(false);
    });
    return unsub;
  }, [zoneId]);

  return { data, loading };
}
