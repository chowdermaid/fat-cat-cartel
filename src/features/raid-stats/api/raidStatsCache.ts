import type { ZoneData } from "../types";

const CACHE_TTL = 60 * 60 * 1000;

function cacheKey(zoneId: number) {
  return `fcc_raidstats_v4_${zoneId}`;
}

export function loadCachedZone(zoneId: number): ZoneData | null {
  try {
    const raw = localStorage.getItem(cacheKey(zoneId));
    if (!raw) return null;
    const { data: cached, timestamp } = JSON.parse(raw) as {
      data: ZoneData;
      timestamp: number;
    };
    if (Date.now() - timestamp < CACHE_TTL) return cached;
  } catch {}
  return null;
}

export function saveCachedZone(zoneId: number, data: ZoneData) {
  localStorage.setItem(
    cacheKey(zoneId),
    JSON.stringify({ data, timestamp: Date.now() }),
  );
}
