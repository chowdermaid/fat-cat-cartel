import { db, get, ref } from "@/lib/db";
import type { ZoneData } from "../types";

export function fetchRaidStatsZone(zoneId: number): Promise<ZoneData | null> {
  return get(ref(db, `raidStats/zones/${zoneId}`)).then(
    (snap: { val(): ZoneData | null }) => snap.val(),
  );
}

export function fetchRaidStatsZoneLastUpdated(
  zoneId: number,
): Promise<number | null> {
  return get(ref(db, `raidStats/zones/${zoneId}/lastUpdated`)).then(
    (snap: { val(): number | null }) => snap.val(),
  );
}
