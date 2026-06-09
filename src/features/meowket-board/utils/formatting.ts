export function formatGil(value: number | null | undefined) {
  return typeof value === "number"
    ? `${Math.round(value).toLocaleString()} gil`
    : "Unavailable";
}

export function formatDecimal(value: number | null | undefined) {
  return typeof value === "number" ? value.toFixed(2) : "-";
}

export function formatSaleTime(value: number | null | undefined) {
  if (typeof value !== "number") return "-";
  return formatRelativeTime(value * 1000);
}

export function shortGil(value: number) {
  const absolute = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (absolute >= 1_000_000) {
    return `${sign}${(absolute / 1_000_000).toFixed(1)}m`;
  }
  if (absolute >= 1_000) {
    return `${sign}${Math.round(absolute / 1_000)}k`;
  }
  return `${Math.round(value)}`;
}

export function shortGilWithUnit(value: number) {
  return `${shortGil(value)} gil`;
}

export function formatChartGil(value: unknown) {
  return typeof value === "number" ? formatGil(value) : String(value ?? "-");
}

export function formatQuantity(value: number) {
  return Number.isInteger(value)
    ? value.toLocaleString()
    : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function formatPercent(value: number | null | undefined) {
  return typeof value === "number"
    ? `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`
    : "-";
}

export function formatRelativeTime(value: number) {
  const seconds = Math.max(0, Math.round((Date.now() - value) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function formatUploadTime(value: number | null | undefined) {
  if (typeof value !== "number") return "-";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
