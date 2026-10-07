import type { UcobProgressPoint } from "../types";

export function buildMilestones(points: UcobProgressPoint[]) {
  return points.filter((point, index) => index === 0 || point.bestBossHpRemaining < points[index - 1].bestBossHpRemaining);
}

export function buildPhaseBands(points: UcobProgressPoint[]) {
  const ranges = new Map<string, { min: number; max: number }>();
  for (const point of points) {
    if (!point.phase) continue;
    const range = ranges.get(point.phase);
    ranges.set(point.phase, {
      min: Math.min(range?.min ?? 100, point.bossHpRemaining),
      max: Math.max(range?.max ?? 0, point.bossHpRemaining),
    });
  }
  const observed = [...ranges.entries()].map(([phase, range]) => ({ phase, ...range })).sort((a, b) => b.max - a.max);
  if (observed.length < 2) return [];
  return observed.map((band, index) => ({
    phase: band.phase,
    max: index ? (observed[index - 1].min + band.max) / 2 : 100,
    min: index < observed.length - 1 ? (band.min + observed[index + 1].max) / 2 : 0,
  }));
}

export function progressInsights(points: UcobProgressPoint[]) {
  const counts = new Map<string, number>();
  let furthestPhase: string | null = null;
  let furthestRank = 0;
  for (const point of points) {
    if (point.mechanicName) counts.set(point.mechanicName, (counts.get(point.mechanicName) ?? 0) + 1);
    const rank = Number(point.phase?.match(/\d+/)?.[0] ?? 0);
    if (rank > furthestRank) {
      furthestRank = rank;
      furthestPhase = point.phase;
    }
  }
  const wall = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  return { furthestPhase, wall: wall ? `${wall[0]} (${wall[1]})` : "-" };
}
