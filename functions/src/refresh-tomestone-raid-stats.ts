import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";
import { ZONES, type ZoneConfig, type ZoneEncounter } from "./zones";
import { memberSyncError, memberSyncSuccess } from "./member-sync-status";

const TOMESTONE_BASE_URL = "https://tomestone.gg/api";
const ACTIVITY_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const GRAPH_CACHE_TTL = 6 * 60 * 60 * 1000;
const TOMESTONE_REQUEST_DELAY_MS = 750;
const DMU_ZONE_ID = 76;
const DMU_ENCOUNTER_KEY = "dmu";

interface MemberNode {
  name: string;
  server: string | null;
  avatarUrl?: string | null;
  fcRank?: string | null;
}

interface TomestoneJob {
  canonicalName?: string | null;
  localizedName?: string | null;
  abbreviation?: string | null;
  icon?: string | null;
}

interface TomestoneCharacter {
  id?: number | string | null;
  name?: string | null;
  server?: string | null;
  datacenter?: string | null;
  avatar?: string | null;
  portrait?: string | null;
  banner?: string | null;
  freeCompany?: unknown;
  title?: unknown;
  race?: string | null;
  tribe?: string | null;
  gender?: string | null;
  achievementPoints?: number | null;
  totalMounts?: number | null;
  totalMinions?: number | null;
  externalUrls?: unknown;
  lastUpdated?: string | number | null;
  encounters?: Record<string, unknown>;
}

interface TomestoneEncounterSummary {
  id?: number | null;
  name?: string | null;
  canonicalName?: string | null;
  compactName?: string | null;
  zoneName?: string | null;
  categoryCanonicalName?: string | null;
  encounterGroupCanonicalName?: string | null;
  expansionCanonicalName?: string | null;
  activity?: {
    completedAt?: number | null;
    completionWeek?: string | null;
    patch?: string | null;
    link?: string | null;
  } | null;
}

interface TomestoneActivity {
  id?: number | string | null;
  startTime?: string | null;
  endTime?: string | null;
  expansionCanonicalName?: string | null;
  categoryLocalizedName?: string | null;
  contentLocalizedName?: string | null;
  territoryLocalizedName?: string | null;
  banner?: string | null;
  killsCount?: number | null;
  wipesCount?: number | null;
  bestPercent?: string | null;
  killDuration?: string | null;
  reportMetadata?: { url?: string | null; code?: string | null } | null;
  displayCharacterJobOrSpec?: TomestoneJob | null;
  encounter?: {
    id?: number | null;
    canonicalName?: string | null;
    localizedName?: string | null;
    encounterGroupCanonicalName?: string | null;
    encounterGroupLocalizedName?: string | null;
    expansionCanonicalName?: string | null;
  } | null;
  encounterGroup?: {
    categoryCanonicalName?: string | null;
    canonicalName?: string | null;
    expansionCanonicalName?: string | null;
  } | null;
  characters?: unknown[] | null;
}

interface ActivityRow {
  activity?: TomestoneActivity;
}

interface ActivityPayload {
  activity?: {
    activities?: {
      activities?: {
        paginator?: {
          data?: ActivityRow[];
          next_page_url?: string | null;
        };
      };
    };
  };
}

interface CompactActivity {
  id: string;
  lodestoneId: string;
  encounterKey: string;
  encounterName: string;
  zoneId: number;
  zoneName: string;
  contentType: string;
  job: string | null;
  jobAbbr: string | null;
  startedAt: number;
  endedAt: number | null;
  clearCount: number;
  wipeCount: number;
  bestProgress: number | null;
  killDuration: string | null;
  reportUrl: string | null;
  participantCount: number;
}

interface DmuProgressPoint {
  pull: number;
  startedAt: number | null;
  durationMs: number | null;
  bossHpRemaining: number;
  bestBossHpRemaining: number;
  phase: string | null;
  displayPercentText: string | null;
  displayBossPercent: number | null;
  displayPhase: string | null;
  mechanicName: string | null;
  mechanicId: number | null;
  mechanicNumber: number | null;
  mechanicTimeMs: number | null;
  cssPercentClassName: string | null;
  reportCode: string | null;
  reportUrl: string | null;
  isPublic: boolean | null;
}

interface DmuProgressPlayer {
  lodestoneId: string;
  name: string;
  server: string | null;
  avatarUrl: string | null;
  fcRank: string | null;
  pullCount: number;
  timeSpentMs: number;
  bestProgress: number;
  bestPull: number;
  latestActivityAt: number | null;
  points: DmuProgressPoint[];
}

interface DmuProgressCache {
  lastUpdated: number;
  summary: {
    pullCount: number;
    timeSpentMs: number;
    bestProgress: number | null;
    bestPull: number | null;
    bestPlayerName: string | null;
  };
  players: Record<string, DmuProgressPlayer>;
  activities: CompactActivity[];
  sourceStatus: {
    source: "tomestone";
    checkedAt: number;
    trackedMembers: number;
    eligibleMembers: number;
    playersWithProgress: number;
    requestsThisRefresh: number;
    failedMembers: number;
    pageCapReached: boolean;
    failures: Array<{ lodestoneId: string; message: string }>;
  };
}

interface MemberEncounterSummary {
  cleared: boolean;
  firstClearAt: number | null;
  latestClearAt: number | null;
  latestActivityAt: number | null;
  job: string | null;
  jobAbbr: string | null;
  clearCount: number;
  wipeCount: number;
  bestProgress: number | null;
  bestKillDuration: string | null;
  latestKillDuration: string | null;
}

interface ZoneMemberSummary {
  encounters: Record<string, MemberEncounterSummary>;
  latestActivityAt: number | null;
  clearCount: number;
  wipeCount: number;
  mostPlayedJob: string | null;
}

interface GraphRequest {
  lodestoneId?: unknown;
  zoneId?: unknown;
  encounterKey?: unknown;
}

function parseTomestoneDate(value: string | number | null | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (!value) return null;
  const parsed = Date.parse(`${value}Z`);
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePercent(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value.replace("%", ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseGraphPercent(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") return parsePercent(value);
  return null;
}

function parseGraphNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseDisplayPercent(value: unknown): {
  text: string | null;
  bossPercent: number | null;
  phase: string | null;
} {
  if (typeof value !== "string") {
    return { text: null, bossPercent: null, phase: null };
  }
  const text = value.trim();
  const match = text.match(/^([\d.]+)%\s*(P\d+)?$/i);
  const bossPercent = match ? Number(match[1]) : parseGraphPercent(text);
  return {
    text,
    bossPercent: Number.isFinite(bossPercent) ? bossPercent : null,
    phase: match?.[2]?.toUpperCase() ?? null,
  };
}

function parseDurationMs(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 10_000 ? Math.round(value) : Math.round(value * 1000);
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  const parts = trimmed.split(":").map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part))) return null;
  if (parts.length === 2) return Math.round((parts[0] * 60 + parts[1]) * 1000);
  if (parts.length === 3) return Math.round((parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000);
  return null;
}

function graphPointCleared(point: Record<string, unknown>, progress: number | null): boolean {
  return progress === 0
    || point.kill === true
    || point.killed === true
    || point.isKill === true
    || point.cleared === true;
}

function emptyEncounterSummary(): MemberEncounterSummary {
  return {
    cleared: false,
    firstClearAt: null,
    latestClearAt: null,
    latestActivityAt: null,
    job: null,
    jobAbbr: null,
    clearCount: 0,
    wipeCount: 0,
    bestProgress: null,
    bestKillDuration: null,
    latestKillDuration: null,
  };
}

function configuredEncountersByCanonical(): Map<string, { zone: ZoneConfig; encounter: ZoneEncounter }> {
  const map = new Map<string, { zone: ZoneConfig; encounter: ZoneEncounter }>();
  for (const zone of ZONES) {
    for (const encounter of zone.encounters) {
      map.set(encounter.tomestoneCanonicalName, { zone, encounter });
    }
  }
  return map;
}

async function fetchTomestone<T>(token: string, path: string): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(`${TOMESTONE_BASE_URL}${path}`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.ok) return (await res.json()) as T;

    if (res.status === 429 && attempt < 3) {
      const retryAfterSec = Number(res.headers.get("Retry-After"));
      const delayMs = Number.isFinite(retryAfterSec) && retryAfterSec > 0
        ? retryAfterSec * 1000
        : (attempt + 1) * 2500;
      console.warn(`[tomestone] 429 for ${path}; waiting ${delayMs}ms`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      continue;
    }

    throw new Error(`Tomestone request failed: ${res.status} ${path}`);
  }

  throw new Error(`Tomestone request failed after retries: ${path}`);
}

function compactProfile(profile: TomestoneCharacter): Record<string, unknown> {
  return {
    id: profile.id ?? null,
    name: profile.name ?? null,
    server: profile.server ?? null,
    datacenter: profile.datacenter ?? null,
    avatar: profile.avatar ?? null,
    portrait: profile.portrait ?? null,
    banner: profile.banner ?? null,
    freeCompany: profile.freeCompany ?? null,
    title: profile.title ?? null,
    race: profile.race ?? null,
    tribe: profile.tribe ?? null,
    gender: profile.gender ?? null,
    achievementPoints: profile.achievementPoints ?? null,
    totalMounts: profile.totalMounts ?? null,
    totalMinions: profile.totalMinions ?? null,
    externalUrls: profile.externalUrls ?? null,
    lastUpdated: profile.lastUpdated ?? null,
  };
}

function profileEncounterSummaries(profile: TomestoneCharacter): TomestoneEncounterSummary[] {
  const encounters = profile.encounters ?? {};
  return Object.values(encounters)
    .flatMap((value) => Array.isArray(value) ? value : [])
    .filter((value): value is TomestoneEncounterSummary => value && typeof value === "object");
}

async function fetchRecentActivity(
  token: string,
  lodestoneId: string,
  encounterMap: Map<string, { zone: ZoneConfig; encounter: ZoneEncounter }>,
): Promise<CompactActivity[]> {
  const recent: CompactActivity[] = [];
  const cutoff = Date.now() - ACTIVITY_RETENTION_MS;
  let page = 1;
  let reachedOldActivity = false;
  while (!reachedOldActivity && page <= 20) {
    const payload = await fetchTomestone<ActivityPayload>(
      token,
      `/character/activity/${lodestoneId}?page=${page}`,
    );
    const rows = payload.activity?.activities?.activities?.paginator?.data ?? [];
    for (const row of rows) {
      const activity = row.activity;
      if (!activity) continue;
      const canonical = activity?.encounter?.canonicalName ?? null;
      if (!canonical) continue;
      const match = encounterMap.get(canonical);
      if (!match) continue;
      const startedAt = parseTomestoneDate(activity.startTime);
      if (!startedAt) continue;
      if (startedAt < cutoff) {
        reachedOldActivity = true;
        continue;
      }
      recent.push({
        id: String(activity.id ?? `${lodestoneId}-${canonical}-${startedAt}`),
        lodestoneId,
        encounterKey: match.encounter.key,
        encounterName: activity.encounter?.localizedName ?? match.encounter.name,
        zoneId: match.zone.id,
        zoneName: match.zone.name,
        contentType: match.zone.contentType,
        job: activity.displayCharacterJobOrSpec?.localizedName ?? null,
        jobAbbr: activity.displayCharacterJobOrSpec?.abbreviation ?? null,
        startedAt,
        endedAt: parseTomestoneDate(activity.endTime),
        clearCount: activity.killsCount ?? 0,
        wipeCount: activity.wipesCount ?? 0,
        bestProgress: parsePercent(activity.bestPercent),
        killDuration: activity.killDuration ?? null,
        reportUrl: activity.reportMetadata?.url ?? null,
        participantCount: activity.characters?.length ?? 0,
      });
    }
    const next = payload.activity?.activities?.activities?.paginator?.next_page_url;
    if (!next) break;
    page++;
  }
  return recent.sort((a, b) => b.startedAt - a.startedAt);
}

async function fetchDmuRecentActivityPage(
  token: string,
  lodestoneId: string,
  match: { zone: ZoneConfig; encounter: ZoneEncounter },
  memberName: string,
): Promise<{ activities: CompactActivity[]; requests: number }> {
  const activities: CompactActivity[] = [];
  console.log(`[tomestone] DMU ${memberName} activity page 1`);
  const payload = await fetchTomestone<ActivityPayload>(
    token,
    `/character/activity/${lodestoneId}?page=1`,
  );
  const rows = payload.activity?.activities?.activities?.paginator?.data ?? [];
  for (const row of rows) {
    const activity = row.activity;
    if (!activity || activity.encounter?.canonicalName !== match.encounter.tomestoneCanonicalName) continue;
    const startedAt = parseTomestoneDate(activity.startTime);
    if (!startedAt) continue;
    activities.push({
      id: String(activity.id ?? `${lodestoneId}-${match.encounter.key}-${startedAt}`),
      lodestoneId,
      encounterKey: match.encounter.key,
      encounterName: activity.encounter?.localizedName ?? match.encounter.name,
      zoneId: match.zone.id,
      zoneName: match.zone.name,
      contentType: match.zone.contentType,
      job: activity.displayCharacterJobOrSpec?.localizedName ?? null,
      jobAbbr: activity.displayCharacterJobOrSpec?.abbreviation ?? null,
      startedAt,
      endedAt: parseTomestoneDate(activity.endTime),
      clearCount: activity.killsCount ?? 0,
      wipeCount: activity.wipesCount ?? 0,
      bestProgress: parsePercent(activity.bestPercent),
      killDuration: activity.killDuration ?? null,
      reportUrl: activity.reportMetadata?.url ?? null,
      participantCount: activity.characters?.length ?? 0,
    });
  }
  console.log(
    `[tomestone] DMU ${memberName} activity complete: ${activities.length} row${activities.length === 1 ? "" : "s"}, 1 page request`,
  );
  return {
    activities: activities.sort((a, b) => b.startedAt - a.startedAt),
    requests: 1,
  };
}

async function fetchDmuProgressionRows(
  token: string,
  lodestoneId: string,
  match: { zone: ZoneConfig; encounter: ZoneEncounter },
  memberName: string,
): Promise<{ points: DmuProgressPoint[]; requests: number }> {
  const params = new URLSearchParams({
    category: match.zone.tomestoneCategory,
    zone: match.zone.tomestoneZone,
    encounter: match.encounter.tomestoneCanonicalName,
    expansion: match.zone.tomestoneExpansion,
  });
  const raw = await fetchTomestone<{
    data?: { graph?: Array<Record<string, unknown>> };
  }>(token, `/character/progression-graph/${lodestoneId}?${params.toString()}`);

  let bestSoFar: number | null = null;
  const points = (raw.data?.graph ?? []).map((point, index) => {
    const progress = parseGraphPercent(
      point.Pulls ?? point.progress ?? point.percent ?? point.bestPercent ?? point.displayPercent,
    );
    if (progress == null) return null;
    bestSoFar = bestSoFar == null ? progress : Math.min(bestSoFar, progress);
    const pull = parseGraphNumber(point.pull ?? point.Pull ?? point["Pull #"] ?? point.x) ?? index + 1;
    const mechanic = point.mechanic && typeof point.mechanic === "object"
      ? point.mechanic as Record<string, unknown>
      : null;
    const display = parseDisplayPercent(point.displayPercent);
    const reportUrl = typeof point.reportUrl === "string"
      ? point.reportUrl
      : typeof point.url === "string"
        ? point.url
        : null;
    return {
      pull,
      startedAt: parseTomestoneDate(
        point.startTime as string | number | null | undefined
          ?? point.startedAt as string | number | null | undefined,
      ),
      durationMs: parseDurationMs(point.duration ?? point.killDuration),
      bossHpRemaining: progress,
      bestBossHpRemaining: parseGraphPercent(point["Best Pulls"]) ?? bestSoFar,
      phase: display.phase ?? (typeof point.phase === "string" ? point.phase : null),
      displayPercentText: display.text,
      displayBossPercent: display.bossPercent,
      displayPhase: display.phase,
      mechanicName: typeof mechanic?.name === "string" ? mechanic.name : null,
      mechanicId: parseGraphNumber(mechanic?.id),
      mechanicNumber: parseGraphNumber(mechanic?.number),
      mechanicTimeMs: parseDurationMs(mechanic?.time),
      cssPercentClassName: typeof point.cssPercentClassName === "string" ? point.cssPercentClassName : null,
      reportCode: typeof point.reportCode === "string"
        ? point.reportCode
        : typeof point.code === "string"
          ? point.code
          : null,
      reportUrl,
      isPublic: typeof point.isPublic === "boolean" ? point.isPublic : null,
    };
  }).filter((point): point is DmuProgressPoint => point != null);

  console.log(`[tomestone] DMU ${memberName} graph complete: ${points.length} pull row${points.length === 1 ? "" : "s"}`);
  return {
    points: points.sort((a, b) => a.pull - b.pull),
    requests: 1,
  };
}

function mergeProfileClears(
  zoneMembers: Record<number, Record<string, ZoneMemberSummary>>,
  lodestoneId: string,
  profile: TomestoneCharacter,
  encounterMap: Map<string, { zone: ZoneConfig; encounter: ZoneEncounter }>,
): void {
  for (const entry of profileEncounterSummaries(profile)) {
    if (!entry.canonicalName || !entry.activity?.completedAt) continue;
    const match = encounterMap.get(entry.canonicalName);
    if (!match) continue;
    const zoneMember = zoneMembers[match.zone.id][lodestoneId];
    const summary = zoneMember.encounters[match.encounter.key];
    summary.cleared = true;
    summary.firstClearAt = summary.firstClearAt == null
      ? entry.activity.completedAt
      : Math.min(summary.firstClearAt, entry.activity.completedAt);
    summary.latestClearAt = summary.latestClearAt == null
      ? entry.activity.completedAt
      : Math.max(summary.latestClearAt, entry.activity.completedAt);
  }
}

function mergeActivity(
  zoneMembers: Record<number, Record<string, ZoneMemberSummary>>,
  recentByZone: Record<number, CompactActivity[]>,
  activity: CompactActivity,
): void {
  const zoneMember = zoneMembers[activity.zoneId][activity.lodestoneId];
  const summary = zoneMember.encounters[activity.encounterKey];
  const cleared = activity.clearCount > 0;
  summary.clearCount += activity.clearCount;
  summary.wipeCount += activity.wipeCount;
  summary.latestActivityAt = Math.max(summary.latestActivityAt ?? 0, activity.startedAt);
  summary.job = activity.job ?? summary.job;
  summary.jobAbbr = activity.jobAbbr ?? summary.jobAbbr;
  summary.latestKillDuration = activity.killDuration ?? summary.latestKillDuration;
  if (activity.bestProgress != null) {
    summary.bestProgress = summary.bestProgress == null
      ? activity.bestProgress
      : Math.min(summary.bestProgress, activity.bestProgress);
  }
  if (cleared) {
    summary.cleared = true;
    summary.latestClearAt = Math.max(summary.latestClearAt ?? 0, activity.startedAt);
    summary.firstClearAt = summary.firstClearAt == null
      ? activity.startedAt
      : Math.min(summary.firstClearAt, activity.startedAt);
    summary.bestKillDuration = activity.killDuration ?? summary.bestKillDuration;
  }
  zoneMember.latestActivityAt = Math.max(zoneMember.latestActivityAt ?? 0, activity.startedAt);
  zoneMember.clearCount += activity.clearCount;
  zoneMember.wipeCount += activity.wipeCount;
  recentByZone[activity.zoneId].push(activity);
}

function initializeZoneMembers(members: Record<string, MemberNode>): Record<number, Record<string, ZoneMemberSummary>> {
  const result: Record<number, Record<string, ZoneMemberSummary>> = {};
  for (const zone of ZONES) {
    result[zone.id] = {};
    for (const lodestoneId of Object.keys(members)) {
      result[zone.id][lodestoneId] = {
        encounters: Object.fromEntries(
          zone.encounters.map((encounter) => [encounter.key, emptyEncounterSummary()]),
        ),
        latestActivityAt: null,
        clearCount: 0,
        wipeCount: 0,
        mostPlayedJob: null,
      };
    }
  }
  return result;
}

function computeMostPlayedJobs(zoneMembers: Record<number, Record<string, ZoneMemberSummary>>, activities: CompactActivity[]): void {
  const jobCounts = new Map<string, Map<string, number>>();
  for (const activity of activities) {
    if (!activity.job) continue;
    const key = `${activity.zoneId}:${activity.lodestoneId}`;
    const counts = jobCounts.get(key) ?? new Map<string, number>();
    counts.set(activity.job, (counts.get(activity.job) ?? 0) + 1);
    jobCounts.set(key, counts);
  }
  for (const [key, counts] of jobCounts.entries()) {
    const [zoneId, lodestoneId] = key.split(":");
    const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    zoneMembers[Number(zoneId)][lodestoneId].mostPlayedJob = best;
  }
}

function summarizeDmuPlayers(players: Record<string, DmuProgressPlayer>): DmuProgressCache["summary"] {
  const values = Object.values(players);
  const best = values
    .filter((player) => Number.isFinite(player.bestProgress))
    .sort((a, b) => a.bestProgress - b.bestProgress)[0];
  return {
    pullCount: values.reduce((sum, player) => sum + player.pullCount, 0),
    timeSpentMs: values.reduce((sum, player) => sum + player.timeSpentMs, 0),
    bestProgress: best?.bestProgress ?? null,
    bestPull: best?.bestPull ?? null,
    bestPlayerName: best?.name ?? null,
  };
}

async function buildDmuProgressForMembers(
  token: string,
  members: Record<string, MemberNode>,
  trackedMembersCount = Object.keys(members).length,
): Promise<Pick<DmuProgressCache, "players" | "activities" | "sourceStatus">> {
  const match = findZoneAndEncounter(DMU_ZONE_ID, DMU_ENCOUNTER_KEY);
  if (!match) throw new Error("DMU zone config is missing.");

  const players: Record<string, DmuProgressPlayer> = {};
  const activities: CompactActivity[] = [];
  const failures: Array<{ lodestoneId: string; message: string }> = [];
  let requestsThisRefresh = 0;
  const eligibleEntries = Object.entries(members);

  await batchRun(eligibleEntries, async ([lodestoneId, member]) => {
    try {
      console.log(`[tomestone] DMU ${member.name} start`);
      const [graphResult, activityResult] = await Promise.all([
        fetchDmuProgressionRows(token, lodestoneId, match, member.name),
        fetchDmuRecentActivityPage(token, lodestoneId, match, member.name),
      ]);
      requestsThisRefresh += graphResult.requests + activityResult.requests;
      activities.push(...activityResult.activities);
      if (graphResult.points.length === 0 && activityResult.activities.length === 0) {
        console.log(
          `[tomestone] DMU ${member.name} complete: no progress, ${graphResult.requests + activityResult.requests} request${graphResult.requests + activityResult.requests === 1 ? "" : "s"}`,
        );
        return;
      }

      const points = graphResult.points;
      const bestPoint = points
        .filter((point) => Number.isFinite(point.bossHpRemaining))
        .sort((a, b) => a.bossHpRemaining - b.bossHpRemaining)[0];
      const activityTime = activityResult.activities.reduce((sum, activity) => {
        const duration = activity.endedAt != null ? activity.endedAt - activity.startedAt : 0;
        return duration > 0 ? sum + duration : sum;
      }, 0);
      const graphTime = points.reduce((sum, point) => sum + (point.durationMs ?? 0), 0);
      const latestActivityAt = Math.max(
        ...[
          ...activityResult.activities.map((activity) => activity.startedAt),
          ...points.map((point) => point.startedAt ?? 0),
        ],
        0,
      );
      players[lodestoneId] = {
        lodestoneId,
        name: member.name,
        server: member.server,
        avatarUrl: member.avatarUrl ?? null,
        fcRank: member.fcRank ?? null,
        pullCount: points.length,
        timeSpentMs: graphTime || activityTime,
        bestProgress: bestPoint?.bossHpRemaining ?? 100,
        bestPull: bestPoint?.pull ?? points.length,
        latestActivityAt: latestActivityAt > 0 ? latestActivityAt : null,
        points,
      };
      console.log(
        `[tomestone] DMU ${member.name} complete: ${points.length} pull row${points.length === 1 ? "" : "s"}, ${activityResult.activities.length} activity row${activityResult.activities.length === 1 ? "" : "s"}, ${graphResult.requests + activityResult.requests} request${graphResult.requests + activityResult.requests === 1 ? "" : "s"}`,
      );
    } catch (error) {
      console.warn(
        `[tomestone] DMU ${member.name} failed: ${
          error instanceof Error ? error.message : "Unknown Tomestone error"
        }`,
      );
      failures.push({
        lodestoneId,
        message: error instanceof Error ? error.message : "Unknown Tomestone error",
      });
    }
  }, 1, TOMESTONE_REQUEST_DELAY_MS);

  return {
    players,
    activities: activities.sort((a, b) => b.startedAt - a.startedAt),
    sourceStatus: {
      source: "tomestone",
      checkedAt: Date.now(),
      trackedMembers: trackedMembersCount,
      eligibleMembers: eligibleEntries.length,
      playersWithProgress: Object.keys(players).length,
      requestsThisRefresh,
      failedMembers: failures.length,
      pageCapReached: false,
      failures: failures.slice(0, 20),
    },
  };
}

async function writeDmuProgressCache(
  token: string,
  members: Record<string, MemberNode>,
  trackedMembersCount = Object.keys(members).length,
): Promise<DmuProgressCache> {
  const db = admin.database();
  const next = await buildDmuProgressForMembers(token, members, trackedMembersCount);

  const now = Date.now();
  const cache: DmuProgressCache = {
    lastUpdated: now,
    summary: summarizeDmuPlayers(next.players),
    players: next.players,
    activities: next.activities,
    sourceStatus: {
      ...next.sourceStatus,
      checkedAt: now,
      playersWithProgress: Object.keys(next.players).length,
    },
  };
  await db.ref("raidStats/dmuProgress").set(cache);
  return cache;
}

function parseDmuProggerIds(value: string): string[] {
  return [...new Set(value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => /^\d+$/.test(item)))];
}

export async function runRefreshDmuProgress(
  token: string,
  dmuProggers: string,
): Promise<DmuProgressCache["sourceStatus"]> {
  const ids = parseDmuProggerIds(dmuProggers);
  if (ids.length === 0) {
    throw new HttpsError("failed-precondition", "DMU_PROGGERS has no valid Lodestone IDs.");
  }

  const db = admin.database();
  const membersSnap = await db.ref("members").get();
  const allMembers = (membersSnap.val() ?? {}) as Record<string, MemberNode>;
  const members = Object.fromEntries(
    ids.flatMap((lodestoneId) => {
      const member = allMembers[lodestoneId];
      if (!member) {
        console.warn(`[tomestone] DMU progger ${lodestoneId} is not in /members; skipping`);
        return [];
      }
      return [[lodestoneId, member]];
    }),
  ) as Record<string, MemberNode>;

  const cache = await writeDmuProgressCache(token, members, Object.keys(allMembers).length);
  return cache.sourceStatus;
}

async function batchRun<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency = 1,
  delayMs = 0,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    results.push(...(await Promise.all(batch.map((item, j) => fn(item, i + j)))));
    if (delayMs > 0 && i + concurrency < items.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return results;
}

export async function runRefreshTomestoneRaidStatsMember(
  token: string,
  lodestoneId: string,
): Promise<void> {
  const db = admin.database();
  const memberSnap = await db.ref(`members/${lodestoneId}`).get();
  const member = memberSnap.val() as MemberNode | null;
  if (!member) {
    throw new Error(`No tracked member found for ${lodestoneId}`);
  }

  const encounterMap = configuredEncountersByCanonical();
  const zoneMembers = initializeZoneMembers({ [lodestoneId]: member });
  const recentByZone = Object.fromEntries(ZONES.map((zone) => [zone.id, [] as CompactActivity[]]));
  const allActivities: CompactActivity[] = [];
  const profile = await fetchTomestone<TomestoneCharacter>(token, `/character/profile/${lodestoneId}`);
  let recent: CompactActivity[] = [];
  let activityLoaded = false;
  try {
    recent = await fetchRecentActivity(token, lodestoneId, encounterMap);
    activityLoaded = true;
  } catch (error) {
    console.warn(
      `[tomestone] recent activity failed for ${member.name}: ${
        error instanceof Error ? error.message : "Unknown Tomestone error"
      }`,
    );
  }
  mergeProfileClears(zoneMembers, lodestoneId, profile, encounterMap);
  for (const activity of recent) {
    mergeActivity(zoneMembers, recentByZone, activity);
    allActivities.push(activity);
  }
  computeMostPlayedJobs(zoneMembers, allActivities);

  const now = Date.now();
  const updates: Record<string, unknown> = {
    [`members/${lodestoneId}/tomestoneProfile`]: compactProfile(profile),
    membersLastUpdated: now,
    "raidStats/lastUpdated": now,
  };
  if (activityLoaded) {
    updates[`memberActivity/${lodestoneId}/tomestone/recent`] = recent;
  }
  if (profile.name) updates[`members/${lodestoneId}/name`] = profile.name;
  if (profile.server) updates[`members/${lodestoneId}/server`] = profile.server;
  if (profile.avatar && !member.avatarUrl) updates[`members/${lodestoneId}/avatarUrl`] = profile.avatar;

  for (const zone of ZONES) {
    const prefix = `raidStats/zones/${zone.id}`;
    const existingRecent = ((await db.ref(`${prefix}/recentActivity`).get()).val() ?? []) as CompactActivity[];
    updates[`${prefix}/members/${lodestoneId}`] = zoneMembers[zone.id][lodestoneId];
    updates[`${prefix}/recentActivity`] = [
      ...recentByZone[zone.id],
      ...existingRecent.filter((activity) => activity.lodestoneId !== lodestoneId),
    ]
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, 30);
  }

  await db.ref("/").update(updates);
  console.log(`[tomestone] refreshed member ${lodestoneId}`);
}

export async function runRefreshTomestoneRaidStats(token: string): Promise<void> {
  const db = admin.database();
  const membersSnap = await db.ref("members").get();
  const members = (membersSnap.val() ?? {}) as Record<string, MemberNode>;
  const encounterMap = configuredEncountersByCanonical();
  const zoneMembers = initializeZoneMembers(members);
  const recentByZone = Object.fromEntries(ZONES.map((zone) => [zone.id, [] as CompactActivity[]]));
  const allActivities: CompactActivity[] = [];
  const failures: Array<{ lodestoneId: string; message: string }> = [];
  const recentFailures: Array<{ lodestoneId: string; message: string }> = [];

  await batchRun(Object.entries(members), async ([lodestoneId, member], index) => {
    console.log(`[tomestone] fetching ${member.name} (${index + 1}/${Object.keys(members).length})`);
    const attemptAt = Date.now();
    try {
      const profile = await fetchTomestone<TomestoneCharacter>(token, `/character/profile/${lodestoneId}`);
      let recent: CompactActivity[] = [];
      let activityLoaded = false;
      try {
        recent = await fetchRecentActivity(token, lodestoneId, encounterMap);
        activityLoaded = true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown Tomestone error";
        console.warn(`[tomestone] recent activity failed for ${member.name}: ${message}`);
        recentFailures.push({ lodestoneId, message });
      }
      mergeProfileClears(zoneMembers, lodestoneId, profile, encounterMap);
      for (const activity of recent) {
        mergeActivity(zoneMembers, recentByZone, activity);
        allActivities.push(activity);
      }
      const updates: Record<string, unknown> = {
        [`members/${lodestoneId}/tomestoneProfile`]: compactProfile(profile),
        [`memberSyncStatus/${lodestoneId}/tomestone`]: memberSyncSuccess(
          "tomestone",
          attemptAt,
          Date.now(),
          activityLoaded ? "tomestone refreshed." : "tomestone profile refreshed; recent activity failed.",
        ),
        membersLastUpdated: Date.now(),
      };
      if (profile.name) updates[`members/${lodestoneId}/name`] = profile.name;
      if (profile.server) updates[`members/${lodestoneId}/server`] = profile.server;
      if (profile.avatar && !member.avatarUrl) updates[`members/${lodestoneId}/avatarUrl`] = profile.avatar;
      if (activityLoaded) {
        updates[`memberActivity/${lodestoneId}/tomestone/recent`] = recent;
      }
      await db.ref("/").update(updates);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Tomestone error";
      console.warn(`[tomestone] failed ${member.name}: ${message}`);
      failures.push({ lodestoneId, message });
      await db.ref(`memberSyncStatus/${lodestoneId}/tomestone`).set(memberSyncError(attemptAt, message));
    }
  }, 1, TOMESTONE_REQUEST_DELAY_MS);

  computeMostPlayedJobs(zoneMembers, allActivities);

  const now = Date.now();
  const updates: Record<string, unknown> = {
    "raidStats/lastUpdated": now,
    "raidStats/sourceStatus": {
      source: "tomestone",
      checkedAt: now,
      requestsThisRefresh: Object.keys(members).length * 2,
      trackedMembers: Object.keys(members).length,
      failedMembers: failures.length,
      failures: failures.slice(0, 20),
      recentActivityFailures: recentFailures.slice(0, 20),
    },
  };

  for (const zone of ZONES) {
    const prefix = `raidStats/zones/${zone.id}`;
    updates[`${prefix}/meta`] = {
      id: zone.id,
      name: zone.name,
      shortName: zone.shortName,
      contentType: zone.contentType,
      tomestoneCategory: zone.tomestoneCategory,
      tomestoneZone: zone.tomestoneZone,
      tomestoneExpansion: zone.tomestoneExpansion,
      encounters: zone.encounters.map((encounter) => ({
        id: encounter.id,
        key: encounter.key,
        label: encounter.label,
        name: encounter.name,
        tomestoneCanonicalName: encounter.tomestoneCanonicalName,
      })),
    };
    updates[`${prefix}/lastUpdated`] = now;
    updates[`${prefix}/members`] = zoneMembers[zone.id];
    updates[`${prefix}/recentActivity`] = recentByZone[zone.id]
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, 30);
  }

  await db.ref("/").update(updates);
  console.log(`[tomestone] wrote ${ZONES.length} zones for ${Object.keys(members).length} members`);
}

function findZoneAndEncounter(zoneId: number, encounterKey: string): { zone: ZoneConfig; encounter: ZoneEncounter } | null {
  const zone = ZONES.find((candidate) => candidate.id === zoneId);
  const encounter = zone?.encounters.find((candidate) => candidate.key === encounterKey);
  return zone && encounter ? { zone, encounter } : null;
}

export async function fetchTomestoneProgressionGraph(
  token: string,
  request: GraphRequest,
): Promise<Record<string, unknown>> {
  const lodestoneId = String(request.lodestoneId ?? "");
  const zoneId = Number(request.zoneId);
  const encounterKey = String(request.encounterKey ?? "");
  if (!/^\d+$/.test(lodestoneId) || !Number.isFinite(zoneId) || !encounterKey) {
    throw new HttpsError("invalid-argument", "lodestoneId, zoneId, and encounterKey are required.");
  }

  const match = findZoneAndEncounter(zoneId, encounterKey);
  if (!match) throw new HttpsError("not-found", "Unknown raid zone or encounter.");

  const cacheRef = admin.database().ref(`memberProgressionGraphs/${lodestoneId}/${encounterKey}`);
  const cached = (await cacheRef.get()).val() as { lastFetched?: number } | null;
  if (cached?.lastFetched && Date.now() - cached.lastFetched < GRAPH_CACHE_TTL) {
    return cached;
  }

  const params = new URLSearchParams({
    category: match.zone.tomestoneCategory,
    zone: match.zone.tomestoneZone,
    encounter: match.encounter.tomestoneCanonicalName,
    expansion: match.zone.tomestoneExpansion,
  });
  const raw = await fetchTomestone<{
    xAxisLabel?: string;
    yAxisLabel?: string;
    categoryLabel?: string;
    bestPullsLabel?: string;
    data?: { graph?: Array<Record<string, unknown>> };
  }>(token, `/character/progression-graph/${lodestoneId}?${params.toString()}`);

  const graph = (raw.data?.graph ?? []).map((point) => {
    const progress = parseGraphPercent(point.Pulls ?? point.progress ?? point.percent ?? point.bestPercent ?? point.displayPercent);
    return {
      pull: point.pull ?? null,
      startedAt: point.startTime ?? null,
      duration: point.duration ?? null,
      progress,
      displayPercent: point.displayPercent ?? null,
      bestProgress: parseGraphPercent(point["Best Pulls"]),
      cleared: graphPointCleared(point, progress),
      mechanic: point.mechanic ?? null,
      reportCode: point.reportCode ?? null,
      isPublic: point.isPublic ?? null,
    };
  });
  const compact = {
    lastFetched: Date.now(),
    lodestoneId,
    zoneId,
    encounterKey,
    encounterName: match.encounter.name,
    xAxisLabel: raw.xAxisLabel ?? "Pull",
    yAxisLabel: raw.yAxisLabel ?? "Percent",
    graph,
  };
  await cacheRef.set(compact);
  return compact;
}
