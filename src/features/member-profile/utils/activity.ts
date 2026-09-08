import { displayJobName } from "./jobs";
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
    if (activity.job && activity.job !== "Unknown") {
      const job = displayJobName(activity.job);
      jobs.set(job, (jobs.get(job) ?? 0) + 1);
    }
  }
  const topJob =
    [...jobs.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? "No job yet";
  return { clears, wipes, topJob, latest: activities.length ? Math.max(...activities.map((row) => row.startedAt)) : null };
}

export function groupEncounterActivity(activities: TomestoneActivity[]) {
  const groups = new Map<string, { key: string; name: string; zone: string; contentType: string; clears: number; wipes: number; total: number }>();
  for (const row of activities) {
    const key = `${row.zoneId}:${row.encounterKey}:${row.contentType}`;
    const item = groups.get(key) ?? { key, name: row.encounterName, zone: row.zoneName, contentType: row.contentType, clears: 0, wipes: 0, total: 0 };
    item.clears += row.clearCount;
    item.wipes += row.wipeCount;
    item.total = item.clears + item.wipes;
    groups.set(key, item);
  }
  return [...groups.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name) || a.key.localeCompare(b.key));
}

export function groupJobActivity(activities: TomestoneActivity[]) {
  const counts = new Map<string, number>();
  for (const activity of activities) {
    const name = activity.job ? displayJobName(activity.job) : "Unknown";
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, value]) => ({ name, value, percent: value / activities.length * 100 }));
}
