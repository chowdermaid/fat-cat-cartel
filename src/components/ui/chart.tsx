import * as React from "react";
import { ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";

export type ChartConfig = Record<
  string,
  {
    label?: string;
    color?: string;
  }
>;

type ChartContextValue = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextValue | null>(null);

function ChartContainer({
  config,
  className,
  children,
}: {
  config: ChartConfig;
  className?: string;
  children: React.ReactNode;
}) {
  const style = Object.fromEntries(
    Object.entries(config).flatMap(([key, value], index) => [
      [`--color-${key}`, value.color ?? `var(--chart-${index + 1}, var(--primary))`],
    ]),
  ) as React.CSSProperties;

  return (
    <ChartContext.Provider value={{ config }}>
      <div className={cn("w-full text-xs", className)} style={style}>
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

function ChartTooltipContent({
  active,
  payload,
  label,
  valueFormatter,
}: {
  active?: boolean;
  payload?: Array<{
    color?: string;
    dataKey?: string | number;
    name?: string | number;
    value?: unknown;
  }>;
  label?: string | number;
  valueFormatter?: (value: unknown) => React.ReactNode;
}) {
  const context = React.useContext(ChartContext);

  if (!active || !payload?.length) return null;

  return (
    <div className="grid min-w-32 gap-1.5 rounded-lg border bg-background px-2.5 py-2 text-xs shadow-xl">
      {label !== undefined && (
        <p className="font-medium text-foreground">{label}</p>
      )}
      <div className="grid gap-1.5">
        {payload.map((item, index) => {
          const key = String(item.dataKey ?? item.name ?? index);
          const config = context?.config[key];
          return (
            <div
              key={`${key}-${index}`}
              className="flex items-center justify-between gap-4"
            >
              <span className="flex items-center gap-2 text-muted-foreground">
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: item.color }}
                />
                {config?.label ?? item.name ?? key}
              </span>
              <span className="font-mono font-medium text-foreground">
                {valueFormatter
                  ? valueFormatter(item.value)
                  : formatTooltipValue(item.value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ChartTooltip = Tooltip;

function formatTooltipValue(value: unknown) {
  return typeof value === "number" ? value.toLocaleString() : String(value ?? "-");
}

export { ChartContainer, ChartTooltip, ChartTooltipContent };
