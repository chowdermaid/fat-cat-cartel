export function formatPercent(value: number | null | undefined): string {
  return value == null ? "-" : `${value.toFixed(2)}%`;
}

export function formatDuration(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return "-";
  const totalSeconds = Math.round(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}.${Math.round((minutes / 60) * 10)} hours`;
  return `${minutes} minutes`;
}

export function formatDateTime(ms: number | null | undefined): string {
  if (!ms) return "-";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(ms));
}

export function timeAgoShort(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  if (mins < 2) return "just now";
  if (hours < 1) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
