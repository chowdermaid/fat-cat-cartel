import type { TomestoneActivity } from "@/features/raid-stats/types";

export function activityLabel(activity: TomestoneActivity): string {
  if (activity.clearCount > 0)
    return `${activity.clearCount} clear${activity.clearCount === 1 ? "" : "s"}`;
  if (activity.bestProgress != null)
    return `${activity.bestProgress.toFixed(1)}% best`;
  return "activity";
}

export function fmtRdps(rdps: number): string {
  return rdps >= 1000 ? `${(rdps / 1000).toFixed(1)}k` : String(rdps);
}

export function dayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function compactContentType(type: string): string {
  if (type === "alliance") return "Alliance";
  if (type === "trial") return "Trial";
  if (type === "savage") return "Savage";
  return type;
}

export function activityImpact(activity: TomestoneActivity): number {
  return activity.clearCount + activity.wipeCount;
}

export function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function buildActivitySummary(activities: TomestoneActivity[]) {
  const clears = activities.reduce(
    (sum, activity) => sum + activity.clearCount,
    0,
  );
  const wipes = activities.reduce(
    (sum, activity) => sum + activity.wipeCount,
    0,
  );
  const jobs = new Map<string, number>();
  for (const activity of activities) {
    if (activity.job) jobs.set(activity.job, (jobs.get(activity.job) ?? 0) + 1);
  }
  const topJob =
    [...jobs.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "No job yet";
  return { clears, wipes, topJob, latest: activities[0]?.startedAt ?? null };
}
