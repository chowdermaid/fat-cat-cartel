import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { TomestoneActivity } from "@/features/raid-stats/types";
import { groupEncounterActivity, groupJobActivity } from "../../utils/activity";
import { JobIcon } from "../jobs/JobIcon";

const attemptConfig = {
  clears: { label: "Clears", color: "var(--color-amber-500)" },
  wipes: { label: "Wipes", color: "var(--color-red-400)" },
};
const tooltipClass = "rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md";

function NoActivity() {
  return <div className="flex h-64 items-center justify-center text-center text-sm text-muted-foreground">No recent raid activity yet.</div>;
}

function AttemptLegend() {
  return <div className="mb-3 flex gap-4 text-xs text-muted-foreground"><span><span className="mr-1.5 inline-block h-2 w-2 rounded-sm bg-amber-500" />Clears</span><span><span className="mr-1.5 inline-block h-2 w-2 rounded-sm bg-red-400" />Wipes</span></div>;
}

function AttemptValues({ clears, wipes }: { clears: number; wipes: number }) {
  return <p className="mt-1">{clears} clears - {wipes} wipes - {clears + wipes} total attempts</p>;
}

export function EncounterActivityChart({ activities }: { activities: TomestoneActivity[] }) {
  const data = groupEncounterActivity(activities);
  if (!data.length) return <NoActivity />;
  return <div>
    <AttemptLegend />
    <ScrollArea className="h-64" viewportClassName="h-64">
      <div style={{ height: Math.max(240, data.length * 52) }} className="pr-3">
        <ChartContainer config={attemptConfig} className="h-full">
          <BarChart accessibilityLayer data={data} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid horizontal={false} stroke="var(--border)" />
            <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} stroke="var(--muted-foreground)" />
            <YAxis type="category" dataKey="key" width={112} tickLine={false} axisLine={false} stroke="var(--muted-foreground)" tickFormatter={(key: string) => { const name = data.find((row) => row.key === key)?.name ?? key; return name.length > 17 ? `${name.slice(0, 16)}-` : name; }} />
            <ChartTooltip cursor={{ fill: "var(--muted)", opacity: 0.4 }} content={({ active, payload }) => {
              const row = payload?.[0]?.payload as (typeof data)[number] | undefined;
              return active && row ? <div className={tooltipClass}><p className="font-medium">{row.name}</p><p>{row.zone} - {row.contentType}</p><AttemptValues clears={row.clears} wipes={row.wipes} /></div> : null;
            }} />
            <Bar dataKey="clears" name="Clears" stackId="attempts" fill="var(--color-clears)" maxBarSize={22} />
            <Bar dataKey="wipes" name="Wipes" stackId="attempts" fill="var(--color-wipes)" maxBarSize={22} />
          </BarChart>
        </ChartContainer>
      </div>
    </ScrollArea>
  </div>;
}

export function JobUsageDonut({ activities }: { activities: TomestoneActivity[] }) {
  const data = groupJobActivity(activities).map((row, index) => ({ ...row, fill: row.name === "Unknown" ? "var(--muted-foreground)" : `var(--chart-${index % 5 + 1})` }));
  if (!data.length) return <NoActivity />;
  return <div className="grid min-h-64 items-center gap-4 sm:grid-cols-2">
    <div className="relative min-w-0">
      <ChartContainer config={{ value: { label: "Activities" } }} className="h-56">
        <PieChart accessibilityLayer>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="85%" paddingAngle={data.length > 1 ? 2 : 0} stroke="var(--background)">
            {data.map((row) => <Cell key={row.name} fill={row.fill} />)}
          </Pie>
          <ChartTooltip content={({ active, payload }) => {
            const row = payload?.[0]?.payload as (typeof data)[number] | undefined;
            return active && row ? <div className={tooltipClass}><p className="flex items-center gap-2 font-medium">{row.name !== "Unknown" && <JobIcon fullName={row.name} size={18} />}{row.name}</p><p className="mt-1">{row.value} activities - {row.percent.toFixed(1)}%</p></div> : null;
          }} />
        </PieChart>
      </ChartContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-2xl font-semibold tabular-nums">{activities.length}</span><span className="text-xs text-muted-foreground">activities</span></div>
    </div>
    <ScrollArea className="h-52" viewportClassName="h-52">
      <ul className="space-y-3 pr-3">
        {data.map((row) => <li key={row.name} className="flex items-center gap-2 text-xs">
          <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: row.fill }} />
          {row.name !== "Unknown" ? <JobIcon fullName={row.name} size={18} /> : <span className="w-[18px] text-center text-muted-foreground">?</span>}
          <span className="min-w-0 flex-1 truncate" title={row.name}>{row.name}</span>
          <span className="tabular-nums text-muted-foreground">{row.value} - {row.percent.toFixed(1)}%</span>
        </li>)}
      </ul>
    </ScrollArea>
  </div>;
}
