import type { UcobProgressData, UcobProgressPoint } from "../types";

export function createUcobProgressFixture(now = Date.now()): UcobProgressData {
  let best = 100;
  const points: UcobProgressPoint[] = Array.from({ length: 72 }, (_, index) => {
    const progress = Math.min(100, Math.max(7, 98 - index * 1.2 + (index % 6) * 5));
    best = Math.min(best, progress);
    const phase = `P${Math.min(5, 1 + Math.floor((100 - progress) / 20))}`;
    return {
      pull: index + 1,
      startedAt: now - 86_400_000 + index * 300_000,
      durationMs: 90_000 + index * 4000,
      bossHpRemaining: progress, bestBossHpRemaining: best,
      phase, displayPercentText: `${((progress % 20) * 5).toFixed(1)}% ${phase}`,
      mechanicName: ["Twister", "Nael", "Trio", "Adds", "Golden Bahamut"][Number(phase.slice(1)) - 1],
      mechanicNumber: null, reportCode: null, reportUrl: null, isPublic: true, cleared: false,
    };
  });
  const bestPoint = points.reduce((a, b) => a.bossHpRemaining <= b.bossHpRemaining ? a : b);
  return {
    lastUpdated: now,
    static: { id: "coils-cartel", name: "The Coils Cartel", sourceLodestoneId: "20439006" },
    points,
    activities: [{ id: "sample-session", startedAt: now - 86_400_000, endedAt: now - 64_800_000, clearCount: 0, wipeCount: 72, bestPercent: bestPoint.displayPercentText, killDuration: null, reportUrl: null }],
    summary: {
      pullCount: points.length,
      timeSpentMs: points.reduce((sum, point) => sum + (point.durationMs ?? 0), 0),
      timedPullCount: points.length,
      bestProgress: bestPoint.bossHpRemaining, bestPull: bestPoint.pull,
      latestActivityAt: points.at(-1)?.startedAt ?? null, cleared: false,
    },
    sourceStatus: { source: "tomestone", checkedAt: now, requestsThisRefresh: 0 },
  };
}
