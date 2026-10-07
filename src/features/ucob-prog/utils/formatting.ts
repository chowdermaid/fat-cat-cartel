export function formatPercent(value: number | null | undefined): string {
  return value == null ? "-" : `${value.toFixed(2)}%`;
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || ms <= 0) return "-";
  const seconds = Math.round(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

export function formatDateTime(ms: number | null | undefined): string {
  if (!ms) return "-";
  return new Intl.DateTimeFormat(undefined, {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  }).format(new Date(ms));
}
