import type { ComponentType, ReactNode } from "react";
import { BrickWallFire, Clock, Crown, Flag, Target, Tally5 } from "lucide-react";
import type { DmuProgressData, PlayerWithColor } from "../../types";
import { formatDuration, formatPercent } from "../../utils/formatting";

function MiniAvatarGroup({ players }: { players: PlayerWithColor[] }) {
  if (players.length === 0) return null;
  return (
    <div className="flex -space-x-2">
      {players.slice(0, 4).map((player) => (
        <div
          key={player.lodestoneId}
          className="relative grid h-7 w-7 place-items-center rounded-full border-2 border-background bg-muted text-[10px] font-semibold"
          title={player.name}
        >
          {player.avatarUrl ? (
            <img src={player.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
          ) : (
            player.name.slice(0, 1)
          )}
          {player.bestProgress === 0 && (
            <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-background text-primary shadow-sm">
              <Crown className="h-3 w-3" />
            </span>
          )}
        </div>
      ))}
      {players.length > 4 && (
        <div className="grid h-7 w-7 place-items-center rounded-full border-2 border-background bg-muted text-[10px] font-semibold">
          +{players.length - 4}
        </div>
      )}
    </div>
  );
}

export function DmuChartStats({
  data,
  selectedPlayer,
  bestPlayers,
  bestPhase,
  bestDisplay,
  commonMechanic,
  phaseReach,
}: {
  data: DmuProgressData;
  selectedPlayer: PlayerWithColor | null;
  bestPlayers: PlayerWithColor[];
  bestPhase: string | null;
  bestDisplay: string | null;
  commonMechanic: { name: string; count: number } | null;
  phaseReach: { phase: string | null; count: number; total: number };
}) {
  const pullCount = selectedPlayer?.pullCount ?? data.summary.pullCount;
  const timeSpentMs = selectedPlayer?.timeSpentMs ?? data.summary.timeSpentMs;
  const bestProgress = selectedPlayer?.bestProgress ?? data.summary.bestProgress;
  const stats: Array<{
    label: string;
    value: string;
    Icon: ComponentType<{ className?: string }>;
    trailing?: ReactNode;
  }> = [
    {
      label: "Pulls",
      value: pullCount.toLocaleString(),
      Icon: Tally5,
    },
    {
      label: "Time",
      value: formatDuration(timeSpentMs),
      Icon: Clock,
    },
    {
      label: "Best",
      value: bestDisplay ?? `${formatPercent(bestProgress)}${bestPhase ? ` ${bestPhase}` : ""}`,
      Icon: Target,
      trailing: <MiniAvatarGroup players={bestPlayers} />,
    },
  ];
  const insights: Array<{
    label: string;
    value: string;
    Icon: ComponentType<{ className?: string }>;
  }> = [
    {
      label: "Wall",
      value: commonMechanic
        ? `${commonMechanic.name} (${commonMechanic.count})`
        : "-",
      Icon: BrickWallFire,
    },
    {
      label: "Reach",
      value: phaseReach.phase
        ? selectedPlayer
          ? phaseReach.phase
          : `${phaseReach.phase} (${phaseReach.count}/${phaseReach.total})`
        : "-",
      Icon: Flag,
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
      <div className="flex min-w-0 items-center gap-2 pr-1">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Current view
        </span>
        <span className="flex min-w-0 items-center gap-2 font-medium">
          {selectedPlayer?.avatarUrl ? (
            <img
              src={selectedPlayer.avatarUrl}
              alt=""
              className="h-6 w-6 rounded-full object-cover"
            />
          ) : selectedPlayer ? (
            <span className="grid h-6 w-6 place-items-center rounded-full bg-muted text-[10px] font-semibold">
              {selectedPlayer.name.slice(0, 1)}
            </span>
          ) : null}
          <span className="truncate">
            {selectedPlayer?.name ?? "All players"}
          </span>
        </span>
      </div>
      {stats.map((stat) => (
        <div key={stat.label} className="flex min-w-0 items-center gap-2">
          <stat.Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{stat.label}</span>
          <span className="font-serif text-lg font-bold tabular-nums">
            {stat.value}
          </span>
          {stat.trailing && <span className="shrink-0">{stat.trailing}</span>}
        </div>
      ))}
      {insights.map((insight) => (
        <div key={insight.label} className="flex min-w-0 items-center gap-2">
          <insight.Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{insight.label}</span>
          <span className="max-w-48 truncate font-medium">{insight.value}</span>
        </div>
      ))}
    </div>
  );
}
