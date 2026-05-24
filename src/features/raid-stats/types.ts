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
}

export interface ZoneMeta {
  id: number;
  name: string;
  shortName: string;
  contentType: ContentType;
  encounters: ZoneEncounter[];
}

export interface ParseEntry {
  savage: Partial<Record<string, ParseData>>;
  normal: Partial<Record<string, ParseData>>;
  allStars: AllStars | null;
}

export interface MemberData extends ParseEntry {
  name: string;
  server: string;
  lodestoneId: string | null;
  avatarUrl: string | null;
  fcRank: string | null;
  isFriend: boolean;
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

export interface ZoneData {
  meta: ZoneMeta;
  lastUpdated: number;
  parses: Record<string, ParseEntry>;
  histogram: Record<string, { savage: ParseBuckets; normal: ParseBuckets }>;
  recentKill: RecentKill | null;
  firstKills: Record<string, FirstKillData> | null;
}
