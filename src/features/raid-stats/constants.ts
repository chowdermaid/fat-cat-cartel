export function percentileClass(p: number): string {
  if (p >= 100) return "text-yellow-400";
  if (p >= 99)  return "text-pink-400";
  if (p >= 95)  return "text-orange-400";
  if (p >= 75)  return "text-purple-400";
  if (p >= 50)  return "text-blue-400";
  if (p >= 25)  return "text-green-500";
  return "text-zinc-400";
}

export function percentileBadgeClass(p: number): string {
  if (p >= 100) return "bg-yellow-400/15 text-yellow-400";
  if (p >= 99)  return "bg-pink-400/15 text-pink-400";
  if (p >= 95)  return "bg-orange-400/15 text-orange-400";
  if (p >= 75)  return "bg-purple-400/15 text-purple-400";
  if (p >= 50)  return "bg-blue-400/15 text-blue-400";
  if (p >= 25)  return "bg-green-500/15 text-green-500";
  return "bg-zinc-400/15 text-zinc-400";
}

export function formatJobName(job: string): string {
  return job.replace(/([a-z])([A-Z])/g, "$1 $2");
}

export const BUCKET_COLORS: Record<string, string> = {
  grey:   "#71717a",
  green:  "#22c55e",
  blue:   "#60a5fa",
  purple: "#c084fc",
  orange: "#fb923c",
  pink:   "#f472b6",
  gold:   "#facc15",
};
