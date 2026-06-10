export function formatDate(ms: number | null): string {
  if (!ms) return "Unknown";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(ms);
}

export function timeAgo(ms: number | null): string {
  if (!ms) return "never";
  const hours = Math.floor((Date.now() - ms) / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
