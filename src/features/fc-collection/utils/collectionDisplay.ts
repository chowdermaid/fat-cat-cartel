export function formatSynced(ts: number | null): string | null {
  if (!ts) return null;
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
