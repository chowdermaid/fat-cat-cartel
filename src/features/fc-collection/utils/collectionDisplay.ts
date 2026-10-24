import { FC_COLLECTION_FRESHNESS_MS } from "../constants";

export function formatSynced(ts: number | null): string | null {
  if (!ts) return null;
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function collectionFreshness(
  member: { lastFetched: number; lastError?: string },
  now = Date.now(),
): { unavailable: boolean; stale: boolean; label: string } {
  if (!member.lastFetched) return { unavailable: true, stale: false, label: "Data unavailable" };
  const stale = Boolean(member.lastError) || now - member.lastFetched > FC_COLLECTION_FRESHNESS_MS;
  return {
    unavailable: false,
    stale,
    label: `${stale ? "Stale data. " : ""}Last updated ${formatSynced(member.lastFetched)}`,
  };
}
