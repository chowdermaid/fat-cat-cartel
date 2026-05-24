export type ContentType = "savage" | "trial" | "alliance" | "ultimate";

export interface ParseData {
  percentile: number;
  rdps: number;
  job: string;
}

export interface AllStars {
  points: number;
  worldRank: number;
  regionRank: number;
  serverRank: number;
  rankPercent: number;
  spec: string;
}

export type EncounterKey = string;

export interface ZoneEncounter {
  id: number;
  key: string;
  label: string;
  name: string;
  tomestoneCanonicalName?: string;
}

export interface ZoneMeta {
  id: number;
  name: string;
  shortName: string;
  contentType: ContentType;
  tomestoneCategory?: string;
  tomestoneZone?: string;
  tomestoneExpansion?: string;
  encounters: ZoneEncounter[];
}

export interface ParseEntry {
  savage: Partial<Record<string, ParseData>>;
  normal: Partial<Record<string, ParseData>>;
  allStars: AllStars | null;
}

export interface EncounterProgress {
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

export interface ZoneMemberProgress {
  encounters: Record<string, EncounterProgress>;
  latestActivityAt: number | null;
  clearCount: number;
  wipeCount: number;
  mostPlayedJob: string | null;
}

export interface MemberData extends ParseEntry {
  name: string;
  server: string;
  lodestoneId: string | null;
  avatarUrl: string | null;
  fcRank: string | null;
  isFriend: boolean;
  tomestone?: ZoneMemberProgress | null;
}

export interface ParseBuckets {
  grey: number;
  green: number;
  blue: number;
  purple: number;
  orange: number;
  pink: number;
  gold: number;
}

export interface RecentKill {
  encounterName: string;
  encounterKey: string | null;
  difficulty: "Savage" | "Normal" | "Ultimate";
  date: number;
  reportCode: string;
}

export interface FirstKillData {
  encounterName: string;
  date: number;
  reportCode: string;
}

export interface TomestoneActivity {
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

export interface TomestoneSourceStatus {
  source: "tomestone";
  checkedAt: number;
  requestsThisRefresh: number;
  trackedMembers: number;
  failedMembers: number;
  failures?: Array<{ lodestoneId: string; message: string }>;
}

export interface ProgressionGraphPoint {
  pull: number | null;
  startedAt: number | null;
  duration: number | null;
  progress: number | null;
  displayPercent: string | null;
  bestProgress: number | null;
  cleared?: boolean;
  mechanic: { name?: string; inProgress?: boolean } | null;
  reportCode: string | null;
  isPublic: boolean | null;
}

export interface ProgressionGraphData {
  lastFetched: number;
  lodestoneId: string;
  zoneId: number;
  encounterKey: string;
  encounterName: string;
  xAxisLabel: string;
  yAxisLabel: string;
  graph: ProgressionGraphPoint[];
}

export interface ZoneData {
  meta: ZoneMeta;
  lastUpdated: number;
  parses: Record<string, ParseEntry>;
  histogram: Record<string, { savage: ParseBuckets; normal: ParseBuckets }>;
  recentKill: RecentKill | null;
  firstKills: Record<string, FirstKillData> | null;
  members?: Record<string, ZoneMemberProgress>;
  recentActivity?: TomestoneActivity[];
}
