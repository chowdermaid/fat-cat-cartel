import type { UcobProgressPoint } from "../../types";
import { formatDateTime, formatDuration, formatPercent } from "../../utils/formatting";

export function UcobChartTooltip({ active, payload }: {
  active?: boolean;
  payload?: Array<{ payload?: UcobProgressPoint }>;
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="max-w-72 space-y-2 rounded-lg border bg-background px-3 py-2 text-xs shadow-xl">
      <p className="font-medium">Pull {point.pull} {point.cleared ? "• Clear" : ""}</p>
      <p className="text-muted-foreground">{formatDateTime(point.startedAt)}</p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
        <dt className="text-muted-foreground">Boss / phase</dt><dd className="text-right font-mono">{point.displayPercentText ?? `${formatPercent(point.bossHpRemaining)} ${point.phase ?? ""}`}</dd>
        <dt className="text-muted-foreground">Overall remaining</dt><dd className="text-right font-mono">{formatPercent(point.bossHpRemaining)}</dd>
        <dt className="text-muted-foreground">Best so far</dt><dd className="text-right font-mono">{formatPercent(point.bestBossHpRemaining)}</dd>
        <dt className="text-muted-foreground">Duration</dt><dd className="text-right font-mono">{formatDuration(point.durationMs)}</dd>
        {point.mechanicName && <><dt className="text-muted-foreground">Mechanic</dt><dd className="text-right">{point.mechanicName}{point.mechanicNumber != null ? ` #${point.mechanicNumber}` : ""}</dd></>}
        {point.isPublic != null && <><dt className="text-muted-foreground">Report</dt><dd className="text-right">{point.isPublic ? "Public" : "Private"}</dd></>}
      </dl>
      {point.reportUrl && <a href={point.reportUrl} target="_blank" rel="noopener noreferrer" className="block text-primary hover:underline">Open report</a>}
    </div>
  );
}
