import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceDot, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import type { UcobProgressData } from "../../types";
import { useUcobEntrance } from "../../hooks/useUcobAnimations";
import { buildMilestones, buildPhaseBands } from "../../utils/chartData";
import { UcobChartStats } from "./UcobChartStats";
import { UcobChartTooltip } from "./UcobChartTooltip";
import { UcobEndpointAvatar } from "./UcobEndpointAvatar";

export function UcobProgressChart({ data }: { data: UcobProgressData }) {
  const entranceRef = useUcobEntrance<HTMLElement>(true, 240);
  const bands = buildPhaseBands(data.points);
  const milestones = buildMilestones(data.points);
  const lastPoint = data.points.at(-1);
  return (
    <section ref={entranceRef} className="min-w-0 overflow-hidden rounded-lg border bg-muted/30" aria-label="Static progression chart">
      <div className="border-b px-4 py-3"><UcobChartStats data={data} /></div>
      <div className="flex flex-wrap items-center gap-4 px-4 pt-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-2"><span className="h-0.5 w-5 bg-sky-400" />Each pull</span>
        <span className="flex items-center gap-2"><span className="h-0.5 w-5 bg-violet-500" />Best so far</span>
      </div>
      <div className="p-2 sm:p-4">
        <ChartContainer config={{ bossHpRemaining: { label: "Each pull", color: "#38bdf8" }, bestBossHpRemaining: { label: "Best so far", color: "#8b5cf6" } }} className="h-[420px] sm:h-[560px]">
          <LineChart data={data.points} margin={{ top: 18, right: 32, left: 8, bottom: 20 }} accessibilityLayer>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="pull" type="number" domain={[1, Math.max(2, lastPoint?.pull ?? 1)]} allowDecimals={false} tickLine={false} axisLine={false} label={{ value: "Pull #", position: "insideBottom", offset: -12 }} />
            <YAxis domain={[0, 100]} allowDataOverflow ticks={[0, 20, 40, 60, 80, 100]} tickLine={false} axisLine={false} width={45} tickFormatter={(value: number) => `${value}%`} />
            <ChartTooltip content={<UcobChartTooltip />} />
            {bands.map((band, index) => <ReferenceArea key={band.phase} y1={band.min} y2={band.max} fill="var(--foreground)" fillOpacity={index % 2 ? 0.025 : 0.045} strokeOpacity={0} label={{ value: band.phase, position: "insideTopLeft", fill: "var(--muted-foreground)", fontSize: 11 }} />)}
            <Line type="linear" dataKey="bossHpRemaining" stroke="var(--color-bossHpRemaining)" strokeWidth={1.5} strokeOpacity={0.75} dot={false} isAnimationActive={false} />
            <Line type="stepAfter" dataKey="bestBossHpRemaining" stroke="var(--color-bestBossHpRemaining)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
            {milestones.map((point) => <ReferenceDot key={point.pull} x={point.pull} y={point.bestBossHpRemaining} r={3} fill="#8b5cf6" stroke="var(--background)" />)}
            {lastPoint && <ReferenceDot x={lastPoint.pull} y={lastPoint.bestBossHpRemaining} shape={(props: { cx?: number; cy?: number }) => <UcobEndpointAvatar {...props} name={data.static.name} />} />}
          </LineChart>
        </ChartContainer>
      </div>
    </section>
  );
}
