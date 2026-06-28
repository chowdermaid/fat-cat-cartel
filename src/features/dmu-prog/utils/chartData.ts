import type { DmuChartRow, PlayerWithColor } from "../types";

export function playerBestKey(lodestoneId: string) {
  return `best_${lodestoneId}`;
}

export function playerRawKey(lodestoneId: string) {
  return `raw_${lodestoneId}`;
}

export function buildRows(
  players: PlayerWithColor[],
  selectedId: string | null,
): DmuChartRow[] {
  const maxPull = Math.max(
    1,
    ...players.flatMap((player) => player.points.map((point) => point.pull)),
  );
  const rows = Array.from(
    { length: maxPull },
    (_, index) => ({ pull: index + 1 }) as DmuChartRow,
  );
  for (const player of players) {
    for (const point of player.points) {
      const row = rows[point.pull - 1];
      if (!row) continue;
      row[playerBestKey(player.lodestoneId)] = point.bestBossHpRemaining;
      if (selectedId === player.lodestoneId) {
        row[playerRawKey(player.lodestoneId)] = point.bossHpRemaining;
      }
    }
  }
  return rows;
}

export function buildPhaseMarkers(
  players: PlayerWithColor[],
  selectedId: string | null,
) {
  const visiblePlayers = selectedId
    ? players.filter((player) => player.lodestoneId === selectedId)
    : players;
  const markers = new Map<string, number>();

  for (const player of visiblePlayers) {
    for (const point of player.points) {
      const phase = point.phase?.trim();
      if (!phase) continue;
      const current = markers.get(phase);
      if (current == null || point.bossHpRemaining > current) {
        markers.set(phase, point.bossHpRemaining);
      }
    }
  }

  if (markers.size < 2) return [];
  return [...markers.entries()]
    .map(([phase, percent]) => ({ phase, percent }))
    .sort((a, b) => b.percent - a.percent);
}

function phaseLabel(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/\bP\d+\b/i);
  return match?.[0].toUpperCase() ?? trimmed;
}

export function buildPhaseBands(players: PlayerWithColor[]) {
  const ranges = new Map<string, { min: number; max: number; count: number }>();
  for (const player of players) {
    for (const point of player.points) {
      const phase = phaseLabel(point.displayPhase ?? point.phase);
      if (!phase || !Number.isFinite(point.bossHpRemaining)) continue;
      const current = ranges.get(phase);
      if (!current) {
        ranges.set(phase, {
          min: point.bossHpRemaining,
          max: point.bossHpRemaining,
          count: 1,
        });
      } else {
        current.min = Math.min(current.min, point.bossHpRemaining);
        current.max = Math.max(current.max, point.bossHpRemaining);
        current.count += 1;
      }
    }
  }
  const observed = [...ranges.entries()]
    .map(([phase, range]) => ({ phase, ...range }))
    .sort((a, b) => b.max - a.max);
  return observed.map((band, index) => {
    const previous = observed[index - 1];
    const next = observed[index + 1];
    return {
      ...band,
      max: previous ? (previous.min + band.max) / 2 : Math.min(100, band.max),
      min: next ? (band.min + next.max) / 2 : Math.max(0, band.min),
    };
  });
}

export function buildMilestones(
  players: PlayerWithColor[],
  selectedId: string | null,
) {
  const selectedOnly = selectedId != null;
  const visiblePlayers = selectedOnly
    ? players.filter((player) => player.lodestoneId === selectedId)
    : players;
  return visiblePlayers.flatMap((player) => {
    let previous: number | null = null;
    return player.points.flatMap((point, index) => {
      const best = point.bestBossHpRemaining;
      const improved = previous == null || best < previous;
      const improvement = previous == null ? 0 : previous - best;
      previous = best;
      if (!improved) return [];
      if (!selectedOnly && index > 0 && improvement < 1 && best !== 0) return [];
      return [{
        lodestoneId: player.lodestoneId,
        pull: point.pull,
        percent: best,
        color: player.color,
        selected: selectedOnly,
      }];
    });
  });
}

export function pointForPull(player: PlayerWithColor | null, pull: number | string | undefined) {
  if (!player) return null;
  const numericPull = Number(pull);
  if (!Number.isFinite(numericPull)) return null;
  return player.points.find((point) => point.pull === numericPull) ?? null;
}

export function groupEndpointPlayers(players: PlayerWithColor[]) {
  const groups = new Map<string, PlayerWithColor[]>();
  for (const player of players) {
    if (player.points.length === 0) continue;
    const latestPull = Math.max(...player.points.map((point) => point.pull));
    const key = `${latestPull}:${player.bestProgress.toFixed(2)}`;
    groups.set(key, [...(groups.get(key) ?? []), player]);
  }
  return [...groups.values()].map((group) => ({
    percent: group[0].bestProgress,
    pull: Math.max(...group[0].points.map((point) => point.pull)),
    players: group,
  }));
}

export function bestProgressPlayers(
  players: PlayerWithColor[],
  bestProgress: number | null,
) {
  if (bestProgress == null) return [];
  return players.filter((player) => player.bestProgress === bestProgress);
}

export function bestProgressPhase(
  players: PlayerWithColor[],
  bestProgress: number | null,
) {
  if (bestProgress == null) return null;
  for (const player of players) {
    const point = player.points.find(
      (entry) => entry.bossHpRemaining === bestProgress,
    );
    const phase = point?.phase?.trim();
    if (phase) return phase;
  }
  return null;
}

export function bestProgressDisplay(
  players: PlayerWithColor[],
  bestProgress: number | null,
) {
  if (bestProgress == null) return null;
  for (const player of players) {
    const point = player.points.find(
      (entry) => entry.bossHpRemaining === bestProgress,
    );
    if (point?.displayPercentText) return point.displayPercentText;
  }
  return null;
}

export function mostCommonMechanic(players: PlayerWithColor[]) {
  const counts = new Map<string, number>();
  for (const player of players) {
    for (const point of player.points) {
      const mechanic = point.mechanicName?.trim();
      if (!mechanic) continue;
      counts.set(mechanic, (counts.get(mechanic) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, count]) => ({ name, count }))[0] ?? null;
}

export function phaseReachSummary(players: PlayerWithColor[]) {
  const phaseRank = (phase: string | null) => {
    const match = phase?.match(/\d+/);
    return match ? Number(match[0]) : 0;
  };
  const reaches = players
    .map((player) => {
      const best = player.points.reduce<{ phase: string | null; rank: number }>(
        (current, point) => {
          const phase = phaseLabel(point.displayPhase ?? point.phase);
          const rank = phaseRank(phase);
          return rank > current.rank ? { phase, rank } : current;
        },
        { phase: null, rank: 0 },
      );
      return { player, phase: best.phase, rank: best.rank };
    })
    .filter((entry) => entry.phase != null);
  const bestRank = Math.max(0, ...reaches.map((entry) => entry.rank));
  const bestPhase = reaches.find((entry) => entry.rank === bestRank)?.phase ?? null;
  return {
    phase: bestPhase,
    count: reaches.filter((entry) => entry.rank === bestRank).length,
    total: players.length,
  };
}
