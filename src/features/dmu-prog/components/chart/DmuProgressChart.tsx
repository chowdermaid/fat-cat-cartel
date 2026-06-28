import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceDot,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import type { DmuProgressData, PlayerWithColor } from "../../types";
import {
  bestProgressPlayers,
  bestProgressDisplay,
  bestProgressPhase,
  buildMilestones,
  buildPhaseBands,
  buildRows,
  groupEndpointPlayers,
  mostCommonMechanic,
  phaseReachSummary,
  playerBestKey,
  playerRawKey,
} from "../../utils/chartData";
import { DmuChartStats } from "./DmuChartStats";
import { DmuChartTooltip } from "./DmuChartTooltip";
import { DmuEndpointAvatarMark } from "./DmuEndpointAvatarMark";
import { PlayerRail } from "./PlayerRail";

export function DmuProgressChart({
  data,
  players,
  selectedId,
  hoveredId,
  selectorOpen,
  onSelect,
  onHover,
  onSelectorOpen,
  onClear,
  canRefresh,
  refreshing,
  onRefresh,
}: {
  data: DmuProgressData;
  players: PlayerWithColor[];
  selectedId: string | null;
  hoveredId: string | null;
  selectorOpen: boolean;
  onSelect: (lodestoneId: string) => void;
  onHover: (lodestoneId: string | null) => void;
  onSelectorOpen: (open: boolean) => void;
  onClear: () => void;
  canRefresh: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const selectedPlayer = useMemo(
    () => players.find((player) => player.lodestoneId === selectedId) ?? null,
    [players, selectedId],
  );
  const rows = useMemo(
    () => buildRows(players, selectedId),
    [players, selectedId],
  );
  const playersByKey = useMemo(() => {
    const map = new Map<string, PlayerWithColor>();
    for (const player of players) {
      map.set(playerBestKey(player.lodestoneId), player);
      map.set(playerRawKey(player.lodestoneId), player);
    }
    return map;
  }, [players]);
  const endpointGroups = useMemo(
    () => groupEndpointPlayers(players),
    [players],
  );
  const bestProgress =
    selectedPlayer?.bestProgress ?? data.summary.bestProgress;
  const bestPlayers = useMemo(
    () =>
      selectedPlayer
        ? [selectedPlayer]
        : bestProgressPlayers(players, data.summary.bestProgress),
    [data.summary.bestProgress, players, selectedPlayer],
  );
  const bestPhase = useMemo(
    () => bestProgressPhase(bestPlayers, bestProgress),
    [bestPlayers, bestProgress],
  );
  const bestDisplay = useMemo(
    () => bestProgressDisplay(bestPlayers, bestProgress),
    [bestPlayers, bestProgress],
  );
  const insightPlayers = selectedPlayer ? [selectedPlayer] : players;
  const commonMechanic = useMemo(
    () => mostCommonMechanic(insightPlayers),
    [insightPlayers],
  );
  const phaseReach = useMemo(
    () => phaseReachSummary(insightPlayers),
    [insightPlayers],
  );
  const phaseBands = useMemo(() => buildPhaseBands(players), [players]);
  const milestones = useMemo(
    () => buildMilestones(players, selectedId),
    [players, selectedId],
  );

  return (
    <div className="relative overflow-hidden rounded-lg border bg-muted/30">
      <div className="border-b bg-background/35 px-4 py-2.5">
        <DmuChartStats
          data={data}
          selectedPlayer={selectedPlayer}
          bestPlayers={bestPlayers}
          bestPhase={bestPhase}
          bestDisplay={bestDisplay}
          commonMechanic={commonMechanic}
          phaseReach={phaseReach}
        />
      </div>
      <div className="relative p-3 pr-16 sm:p-4 sm:pr-18">
        <ChartContainer
          config={{}}
          className="h-[560px] min-h-[560px] md:h-[calc(100vh-18rem)] md:min-h-[680px] xl:min-h-[760px]"
        >
          <LineChart
            data={rows}
            margin={{ top: 18, right: 56, left: 6, bottom: 18 }}
          >
            <CartesianGrid
              horizontal
              vertical
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              opacity={0.7}
            />
            <XAxis
              dataKey="pull"
              tickLine={false}
              axisLine={false}
              label={{ value: "Pull #", position: "insideBottom", offset: -8 }}
            />
            <YAxis
              domain={[0, 100]}
              reversed={false}
              tickLine={false}
              axisLine={false}
              label={{ value: "Percent", angle: -90, position: "insideLeft" }}
            />
            <ChartTooltip
              content={
                <DmuChartTooltip
                  playersByKey={playersByKey}
                  selectedPlayer={selectedPlayer}
                />
              }
            />
            {phaseBands.map((band, index) => (
              <ReferenceArea
                key={band.phase}
                y1={band.min}
                y2={band.max}
                fill={
                  index % 2 === 0
                    ? "rgba(255,255,255,0.045)"
                    : "rgba(255,255,255,0.025)"
                }
                stroke="rgba(255,255,255,0.12)"
                strokeOpacity={0.6}
                ifOverflow="extendDomain"
                label={{
                  value: band.phase,
                  position: "insideTopLeft",
                  fill: "rgba(255,255,255,0.55)",
                  fontSize: 11,
                }}
              />
            ))}
            {selectedId &&
              players
                .filter((player) => player.lodestoneId !== selectedId)
                .map((player) => (
                  <Line
                    key={playerBestKey(player.lodestoneId)}
                    type="linear"
                    dataKey={playerBestKey(player.lodestoneId)}
                    stroke={player.color}
                    strokeWidth={1.5}
                    opacity={selectedId ? 0.2 : 0.85}
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                ))}
            {selectedId && (
              <Line
                type="linear"
                dataKey={playerRawKey(selectedId)}
                stroke="#38bdf8"
                strokeWidth={2.5}
                opacity={0.9}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            )}
            {selectedPlayer && (
              <Line
                key={playerBestKey(selectedPlayer.lodestoneId)}
                type="linear"
                dataKey={playerBestKey(selectedPlayer.lodestoneId)}
                stroke={selectedPlayer.color}
                strokeWidth={3}
                opacity={1}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            )}
            {!selectedId &&
              players.map((player) => {
                const isActive = selectedId === player.lodestoneId;
                return (
                  <Line
                    key={playerBestKey(player.lodestoneId)}
                    type="linear"
                    dataKey={playerBestKey(player.lodestoneId)}
                    stroke={player.color}
                    strokeWidth={isActive ? 2.5 : 1.5}
                    opacity={0.85}
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                );
              })}
            {milestones.map((milestone) => (
              <ReferenceDot
                key={`${milestone.lodestoneId}-${milestone.pull}-${milestone.percent}`}
                x={milestone.pull}
                y={milestone.percent}
                r={milestone.selected ? 4 : 2.5}
                fill={milestone.color}
                stroke="hsl(var(--background))"
                strokeWidth={milestone.selected ? 2 : 1}
                opacity={milestone.selected ? 0.95 : 0.4}
                ifOverflow="extendDomain"
              />
            ))}
            {endpointGroups.map((group) => (
              <ReferenceDot
                key={`${group.pull}-${group.percent}`}
                x={group.pull - 2}
                y={group.percent}
                ifOverflow="extendDomain"
                shape={(props) => (
                  <DmuEndpointAvatarMark
                    {...props}
                    players={group.players}
                    onSelect={onSelect}
                  />
                )}
              />
            ))}
          </LineChart>
        </ChartContainer>
      </div>
      <PlayerRail
        players={players}
        selectedId={selectedId}
        hoveredId={hoveredId}
        open={selectorOpen}
        onHover={onHover}
        onSelect={onSelect}
        onOpenChange={onSelectorOpen}
        onClear={onClear}
        canRefresh={canRefresh}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />
    </div>
  );
}
