import { UCOB_PHASES } from "../constants";
import type { UcobPhaseProgress, UcobProgressPoint } from "../types";

export function buildPhaseProgress(points: UcobProgressPoint[], cleared = false): UcobPhaseProgress {
  const isCleared = cleared || points.some((point) => point.cleared);
  let furthestIndex = -1;
  let bestPull: UcobProgressPoint | null = null;
  let bestRemaining: number | null = null;

  for (const point of points) {
    if (Number.isFinite(point.bossHpRemaining) && point.bossHpRemaining >= 0 && point.bossHpRemaining <= 100) {
      bestRemaining = Math.min(bestRemaining ?? 100, point.bossHpRemaining);
    }
    const phase = point.phase?.trim().toUpperCase();
    const index = UCOB_PHASES.findIndex((stage) => stage.id === phase);
    if (index < 0) continue;
    if (index > furthestIndex || (index === furthestIndex && bestPull && (
      point.bossHpRemaining < bestPull.bossHpRemaining ||
      (point.bossHpRemaining === bestPull.bossHpRemaining && point.pull < bestPull.pull)
    ))) {
      furthestIndex = index;
      bestPull = point;
    }
  }

  const state = isCleared ? "cleared" : !points.length ? "unstarted" : furthestIndex < 0 ? "unknown" : "progressing";
  return {
    state,
    completionPercent: isCleared ? 100 : bestRemaining !== null ? 100 - bestRemaining : !points.length ? 0 : null,
    bestPull: isCleared ? null : bestPull,
    stages: UCOB_PHASES.map((phase, index) => ({
      ...phase,
      status: isCleared || index < furthestIndex ? "passed" : index === furthestIndex ? "current" : state === "unknown" ? "unknown" : "unreached",
    })),
  };
}
