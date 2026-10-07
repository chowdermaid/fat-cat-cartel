import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";
import { fetchTomestone } from "./refresh-tomestone-raid-stats";
import { ZONES } from "./zones";

export interface UcobProgressPoint {
  pull: number;
  startedAt: number | null;
  durationMs: number | null;
  bossHpRemaining: number;
  bestBossHpRemaining: number;
  phase: string | null;
  displayPercentText: string | null;
  mechanicName: string | null;
  mechanicNumber: number | null;
  reportCode: string | null;
  reportUrl: string | null;
  isPublic: boolean | null;
  cleared: boolean;
}

export interface UcobActivity {
  id: string;
  startedAt: number;
  endedAt: number | null;
  clearCount: number;
  wipeCount: number;
  bestPercent: string | null;
  killDuration: string | null;
  reportUrl: string | null;
}

export interface UcobProgressData {
  lastUpdated: number;
  static: { id: "coils-cartel"; name: "The Coils Cartel"; sourceLodestoneId: string };
  points: UcobProgressPoint[];
  activities: UcobActivity[];
  summary: {
    pullCount: number;
    timeSpentMs: number;
    timedPullCount: number;
    bestProgress: number | null;
    bestPull: number | null;
    latestActivityAt: number | null;
    cleared: boolean;
  };
  sourceStatus: { source: "tomestone"; checkedAt: number; requestsThisRefresh: number };
}

function numeric(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !/^\s*\d+(?:\.\d+)?\s*%?\s*$/.test(value)) return null;
  const parsed = Number(typeof value === "string" ? value.replace("%", "").trim() : value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function percent(value: unknown): number | null {
  const parsed = numeric(value);
  return parsed != null && parsed <= 100 ? parsed : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function timestamp(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? (value < 1e12 ? value * 1000 : value) : null;
  }
  const date = text(value);
  if (!date) return null;
  const parsed = Date.parse(/(?:Z|[+-]\d\d:\d\d)$/i.test(date) ? date : `${date}Z`);
  return Number.isFinite(parsed) ? parsed : null;
}

function duration(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? Math.round(value > 10_000 ? value : value * 1000) : null;
  }
  const parts = text(value)?.split(":");
  if (!parts || parts.length < 2 || parts.length > 3 || parts.some((part) => !/^\d+(?:\.\d+)?$/.test(part))) return null;
  return Math.round(parts.reduce((sum, part) => sum * 60 + Number(part), 0) * 1000);
}

function reportLink(value: unknown): string | null {
  try {
    const url = new URL(String(value));
    return url.protocol === "https:" && /(^|\.)fflogs\.com$/.test(url.hostname) ? url.href : null;
  } catch {
    return null;
  }
}

export function mapUcobProgressionRows(rows: unknown[]): UcobProgressPoint[] {
  const points = rows.map((raw, index) => {
    if (!raw || typeof raw !== "object") throw new Error("Tomestone returned an invalid UCOB pull.");
    const row = raw as Record<string, unknown>;
    const cleared = row.kill === true || row.killed === true || row.isKill === true || row.cleared === true;
    const progress = cleared ? 0 : percent(row.Pulls ?? row.progress ?? row.percent ?? row.bestPercent ?? row.displayPercent);
    if (progress == null) throw new Error("Tomestone UCOB pull is missing an overall progression percentage.");
    const pull = numeric(row.pull ?? row.Pull ?? row["Pull #"] ?? row.x) ?? index + 1;
    if (!Number.isInteger(pull) || pull < 1) throw new Error("Tomestone returned an invalid UCOB pull number.");
    const mechanic = row.mechanic && typeof row.mechanic === "object" ? row.mechanic as Record<string, unknown> : {};
    const display = text(row.displayPercent);
    const reportCode = text(row.reportCode ?? row.code);
    return {
      pull,
      startedAt: timestamp(row.startTime ?? row.startedAt),
      durationMs: duration(row.duration ?? row.killDuration),
      bossHpRemaining: progress,
      bestBossHpRemaining: progress,
      phase: display?.match(/\bP\d+\b/i)?.[0].toUpperCase() ?? text(row.phase),
      displayPercentText: display,
      mechanicName: text(mechanic.name),
      mechanicNumber: numeric(mechanic.number),
      reportCode,
      reportUrl: reportLink(row.reportUrl ?? row.url) ?? (reportCode && /^[a-zA-Z0-9]+$/.test(reportCode) ? `https://www.fflogs.com/reports/${reportCode}` : null),
      isPublic: typeof row.isPublic === "boolean" ? row.isPublic : null,
      cleared: cleared || progress === 0,
    };
  }).sort((a, b) => a.pull - b.pull);
  let best = 100;
  const seen = new Set<number>();
  for (const point of points) {
    if (seen.has(point.pull)) throw new Error("Tomestone returned duplicate UCOB pull numbers.");
    seen.add(point.pull);
    best = Math.min(best, point.bossHpRemaining);
    point.bestBossHpRemaining = best;
  }
  return points;
}

export function mapUcobActivities(rows: unknown[], canonicalName: string): UcobActivity[] {
  const activities = new Map<string, UcobActivity>();
  for (const raw of rows) {
    const activity = (raw as { activity?: Record<string, unknown> } | null)?.activity;
    if (!activity || (activity.encounter as { canonicalName?: string } | undefined)?.canonicalName !== canonicalName) continue;
    const startedAt = timestamp(activity.startTime);
    if (startedAt == null) continue;
    const id = String(activity.id ?? startedAt);
    const report = activity.reportMetadata as { url?: unknown } | undefined;
    activities.set(id, {
      id, startedAt, endedAt: timestamp(activity.endTime),
      clearCount: numeric(activity.killsCount) ?? 0,
      wipeCount: numeric(activity.wipesCount) ?? 0,
      bestPercent: text(activity.bestPercent),
      killDuration: text(activity.killDuration),
      reportUrl: reportLink(report?.url),
    });
  }
  return [...activities.values()].sort((a, b) => b.startedAt - a.startedAt).slice(0, 24);
}

export function buildUcobProgressData(sourceLodestoneId: string, points: UcobProgressPoint[], activities: UcobActivity[], now = Date.now(), requestsThisRefresh = 2): UcobProgressData {
  const best = points.reduce<UcobProgressPoint | null>((current, point) => !current || point.bossHpRemaining < current.bossHpRemaining ? point : current, null);
  const latest = Math.max(0, ...points.map((point) => point.startedAt ?? 0), ...activities.map((activity) => activity.startedAt));
  return {
    lastUpdated: now,
    static: { id: "coils-cartel", name: "The Coils Cartel", sourceLodestoneId },
    points, activities,
    summary: {
      pullCount: points.length,
      timeSpentMs: points.reduce((sum, point) => sum + (point.durationMs ?? 0), 0),
      timedPullCount: points.filter((point) => point.durationMs != null).length,
      bestProgress: best?.bossHpRemaining ?? null,
      bestPull: best?.pull ?? null,
      latestActivityAt: latest || null,
      cleared: points.some((point) => point.cleared) || activities.some((activity) => activity.clearCount > 0),
    },
    sourceStatus: { source: "tomestone", checkedAt: now, requestsThisRefresh },
  };
}

export async function runRefreshUcobProgress(token: string, sourceLodestoneId: string): Promise<UcobProgressData["sourceStatus"]> {
  if (!/^\d+$/.test(sourceLodestoneId)) throw new HttpsError("failed-precondition", "UCOB source Lodestone ID is invalid.");
  const zone = ZONES.find((candidate) => candidate.id === 19);
  const encounter = zone?.encounters.find((candidate) => candidate.key === "ucob");
  if (!zone || !encounter) throw new HttpsError("failed-precondition", "UCOB encounter configuration is missing.");
  const cacheRef = admin.database().ref("raidStats/ucobProgress");
  const params = new URLSearchParams({ category: zone.tomestoneCategory, zone: zone.tomestoneZone, encounter: encounter.tomestoneCanonicalName, expansion: zone.tomestoneExpansion });
  let requestsThisRefresh = 0;
  const countRequest = () => { requestsThisRefresh++; };
  try {
    const [graph, activity] = await Promise.all([
      fetchTomestone<{ data?: { graph?: unknown[] } }>(token, `/character/progression-graph/${sourceLodestoneId}?${params}`, countRequest),
      fetchTomestone<{ activity?: { activities?: { activities?: { paginator?: { data?: unknown[] } } } } }>(token, `/character/activity/${sourceLodestoneId}?page=1`, countRequest),
    ]);
    const graphRows = graph.data?.graph;
    const activityRows = activity.activity?.activities?.activities?.paginator?.data;
    if (!Array.isArray(graphRows) || !Array.isArray(activityRows)) throw new Error("Tomestone returned an unexpected UCOB response.");
    const points = mapUcobProgressionRows(graphRows);
    const activities = mapUcobActivities(activityRows, encounter.tomestoneCanonicalName);
    const cached = (await cacheRef.get()).val() as UcobProgressData | null;
    if (cached?.static.sourceLodestoneId === sourceLodestoneId && (cached.points?.length ?? 0) > points.length) {
      throw new Error("Tomestone returned fewer UCOB pulls than the saved history. Previous progress was retained.");
    }
    const data = buildUcobProgressData(sourceLodestoneId, points, activities, Date.now(), requestsThisRefresh);
    await cacheRef.set(data);
    return data.sourceStatus;
  } catch (error) {
    throw new HttpsError("unavailable", error instanceof Error ? error.message : "UCOB refresh failed. Previous progress was retained.");
  }
}
