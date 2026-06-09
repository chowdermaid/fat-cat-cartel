import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { CART_ROUTE_WORLDS } from "../../constants";
import type { MeowketProfitResult } from "../../types";
import {
  formatChartGil,
  shortGilWithUnit,
} from "../../utils/formatting";

export function SellPriceByWorldChart({
  calculation,
}: {
  calculation: MeowketProfitResult;
}) {
  const data = CART_ROUTE_WORLDS.map((world) => {
    const price = calculation.finalItemPrices.find(
      (entry) => entry.world === world,
    );
    return {
      world,
      lowest: price?.lowestPricePerUnit ?? null,
      averageLow20: price?.averageLowestTwentyPricePerUnit ?? null,
    };
  });
  const hasPrices = data.some(
    (entry) =>
      typeof entry.lowest === "number" ||
      typeof entry.averageLow20 === "number",
  );

  return (
    <div className="flex h-full min-h-72 flex-1 flex-col rounded-lg border bg-muted/10 p-4">
      <div className="mb-3 flex shrink-0 flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Sell price by world
          </p>
          <p className="text-sm text-muted-foreground">
            Lowest listing and average low 20 across Materia.
          </p>
        </div>
      </div>
      {hasPrices ? (
        <ChartContainer
          className="min-h-56 flex-1"
          config={{
            lowest: { label: "Lowest", color: "var(--chart-2)" },
            averageLow20: { label: "Avg low 20", color: "var(--chart-3)" },
          }}
        >
          <BarChart
            data={data}
            margin={{ top: 12, right: 12, bottom: 8, left: 4 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis dataKey="world" tickLine={false} axisLine={false} />
            <YAxis
              tickFormatter={shortGilWithUnit}
              tickLine={false}
              axisLine={false}
            />
            <ChartTooltip
              content={<ChartTooltipContent valueFormatter={formatChartGil} />}
              cursor={false}
            />
            <Bar
              dataKey="lowest"
              fill="var(--color-lowest)"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="averageLow20"
              fill="var(--color-averageLow20)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      ) : (
        <div className="flex min-h-56 flex-1 items-center justify-center rounded-md border text-sm text-muted-foreground">
          No sell listings found across Materia.
        </div>
      )}
    </div>
  );
}
