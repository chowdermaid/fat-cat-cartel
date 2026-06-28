import type { PlayerWithColor } from "../../types";
import { formatDateTime, formatPercent } from "../../utils/formatting";

function formatPullDuration(ms: number | null | undefined) {
  if (!ms || ms <= 0) return null;
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function DmuChartTooltip({
  active,
  payload,
  label,
  playersByKey,
  selectedPlayer,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string | number; value?: unknown; color?: string }>;
  label?: string | number;
  playersByKey: Map<string, PlayerWithColor>;
  selectedPlayer: PlayerWithColor | null;
}) {
  const rows = payload?.filter((item) => typeof item.value === "number") ?? [];
  if (!active || rows.length === 0) return null;
  const selectedPoint = selectedPlayer?.points.find((point) => point.pull === Number(label)) ?? null;
  if (selectedPlayer && selectedPoint) {
    const duration = formatPullDuration(selectedPoint.durationMs);
    const reportUrl = selectedPoint.reportUrl
      ?? (selectedPoint.reportCode
        ? `https://www.fflogs.com/reports/${selectedPoint.reportCode}`
        : null);
    return (
      <div className="min-w-64 rounded-lg border bg-background px-3 py-2 text-xs shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-medium text-foreground">
              {formatDateTime(selectedPoint.startedAt)}
            </p>
            <p className="mt-1 text-muted-foreground">
              {selectedPlayer.name} - Pull {selectedPoint.pull}
            </p>
          </div>
          <span className="rounded-full bg-primary/15 px-2 py-1 font-mono text-primary">
            {selectedPoint.displayPercentText ?? formatPercent(selectedPoint.bossHpRemaining)}
          </span>
        </div>
        <div className="mt-3 grid gap-1.5">
          {selectedPoint.mechanicName && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Wall</span>
              <span className="max-w-44 truncate text-foreground">
                {selectedPoint.mechanicName}
                {selectedPoint.mechanicNumber != null ? ` #${selectedPoint.mechanicNumber}` : ""}
              </span>
            </div>
          )}
          {duration && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Duration</span>
              <span className="font-mono text-foreground">{duration}</span>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Best</span>
            <span className="font-mono text-foreground">
              {formatPercent(selectedPoint.bestBossHpRemaining)}
            </span>
          </div>
          {selectedPoint.isPublic != null && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Visibility</span>
              <span className="text-foreground">
                {selectedPoint.isPublic ? "Public" : "Private"}
              </span>
            </div>
          )}
          {reportUrl && (
            <a
              href={reportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 truncate text-primary hover:underline"
            >
              {selectedPoint.reportCode ?? "Open report"}
            </a>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="min-w-48 rounded-lg border bg-background px-3 py-2 text-xs shadow-xl">
      <p className="font-medium text-foreground">Pull {label}</p>
      <div className="mt-2 space-y-1">
        {rows.map((item) => {
          const key = String(item.dataKey ?? "");
          const player = playersByKey.get(key);
          return (
            <div key={key} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                {player?.name ?? "Selected pull"}
              </span>
              <span className="font-mono text-foreground">{formatPercent(Number(item.value))}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
