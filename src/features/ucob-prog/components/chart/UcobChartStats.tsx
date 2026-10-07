import { Clock, Flag, Target, Tally5 } from "lucide-react";
import type { UcobProgressData } from "../../types";
import { progressInsights } from "../../utils/chartData";
import { formatDuration, formatPercent } from "../../utils/formatting";
import { UcobStatValue } from "./UcobStatValue";

export function UcobChartStats({ data }: { data: UcobProgressData }) {
  const { summary } = data;
  const best = data.points.find((point) => point.pull === summary.bestPull);
  const insights = progressInsights(data.points);
  const stats = [
    { label: "Pulls", value: summary.pullCount.toLocaleString(), numericValue: summary.pullCount, Icon: Tally5 },
    { label: "Pull time", value: summary.timedPullCount ? `${formatDuration(summary.timeSpentMs)}${summary.timedPullCount < summary.pullCount ? " (partial)" : ""}` : "-", Icon: Clock },
    { label: "Best", value: summary.cleared ? "Cleared" : best?.displayPercentText ?? formatPercent(summary.bestProgress), Icon: Target },
    { label: "Furthest phase", value: insights.furthestPhase ?? "-", Icon: Flag },
  ];
  return (
    <div className="flex flex-wrap gap-x-7 gap-y-3">
      {stats.map(({ label, value, numericValue, Icon }) => (
        <div key={label} className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            {label}
          </p>
          <p className="font-serif text-lg font-bold tabular-nums"><UcobStatValue value={value} numericValue={numericValue} /></p>
        </div>
      ))}
      <div className="min-w-0"><p className="text-xs text-muted-foreground">Common wall</p><p className="font-medium"><UcobStatValue value={insights.wall} /></p></div>
    </div>
  );
}
