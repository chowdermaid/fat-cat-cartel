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

export type UcobPhaseId = "P1" | "P2" | "P3" | "P4" | "P5";

export interface UcobPhaseStage {
  id: UcobPhaseId;
  name: string;
  status: "passed" | "current" | "unreached" | "unknown";
}

export interface UcobPhaseProgress {
  stages: UcobPhaseStage[];
  state: "unstarted" | "unknown" | "progressing" | "cleared";
  bestPull: UcobProgressPoint | null;
  completionPercent: number | null;
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
