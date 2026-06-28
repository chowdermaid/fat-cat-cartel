import type { TomestoneActivity } from "@/features/raid-stats/types";

export interface DmuProgressPoint {
  pull: number;
  startedAt: number | null;
  durationMs: number | null;
  bossHpRemaining: number;
  bestBossHpRemaining: number;
  phase: string | null;
  displayPercentText?: string | null;
  displayBossPercent?: number | null;
  displayPhase?: string | null;
  mechanicName?: string | null;
  mechanicId?: number | null;
  mechanicNumber?: number | null;
  mechanicTimeMs?: number | null;
  cssPercentClassName?: string | null;
  reportCode: string | null;
  reportUrl: string | null;
  isPublic: boolean | null;
}

export interface DmuProgressPlayer {
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

export interface DmuProgressSummary {
  pullCount: number;
  timeSpentMs: number;
  bestProgress: number | null;
  bestPull: number | null;
  bestPlayerName: string | null;
}

export interface DmuProgressSourceStatus {
  source: "tomestone";
  checkedAt: number;
  trackedMembers: number;
  eligibleMembers: number;
  playersWithProgress: number;
  requestsThisRefresh: number;
  failedMembers: number;
  pageCapReached: boolean;
  failures?: Array<{ lodestoneId: string; message: string }>;
}

export interface DmuProgressData {
  lastUpdated: number;
  summary: DmuProgressSummary;
  players: Record<string, DmuProgressPlayer>;
  activities: TomestoneActivity[];
  sourceStatus: DmuProgressSourceStatus;
}

export interface DmuChartRow {
  pull: number;
  [key: string]: number | null;
}

export type PlayerWithColor = DmuProgressPlayer & { color: string };
