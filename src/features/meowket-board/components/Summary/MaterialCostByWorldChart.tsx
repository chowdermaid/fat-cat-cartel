import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  type ChartConfig,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { CART_ROUTE_WORLDS } from "../../constants";
import type { MeowketProfitResult } from "../../types";
import {
  formatChartGil,
  shortGilWithUnit,
} from "../../utils/formatting";

export function MaterialCostByWorldChart({
  calculation,
}: {
  calculation: MeowketProfitResult;
}) {
  const { config, data, keys } = materialCostByWorldData(calculation);
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Material cost by world</CardTitle>
        <CardDescription>
          Whole-stack material cost if bought entirely on each world.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col">
        {data.length === 0 ? (
          <div className="flex min-h-72 flex-1 items-center justify-center rounded-lg border text-sm text-muted-foreground">
            No complete material cart.
          </div>
        ) : (
          <ChartContainer className="min-h-72 flex-1" config={config}>
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
                content={
                  <ChartTooltipContent valueFormatter={formatChartGil} />
                }
                cursor={false}
              />
              {keys.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  stackId="materials"
                  fill={`var(--color-${key})`}
                  radius={index === keys.length - 1 ? [4, 4, 0, 0] : 0}
                />
              ))}
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

function materialCostByWorldData(calculation: MeowketProfitResult): {
  config: ChartConfig;
  data: Array<Record<string, number | string>>;
  keys: string[];
} {
  const materialTotals = new Map<string, { label: string; total: number }>();
  for (const material of calculation.materials) {
    const total = material.worldPrices.reduce(
      (sum, price) =>
        sum + (typeof price.checkoutCost === "number" ? price.checkoutCost : 0),
      0,
    );
    materialTotals.set(`${material.itemId}-${material.name}`, {
      label: material.name,
      total,
    });
  }

  const topMaterials = Array.from(materialTotals.entries())
    .sort((left, right) => right[1].total - left[1].total)
    .slice(0, 5);
  const keyByMaterial = new Map(
    topMaterials.map(([materialKey], index) => [materialKey, `m${index}`]),
  );
  const hasOther = materialTotals.size > topMaterials.length;
  const keys = [
    ...topMaterials.map((_, index) => `m${index}`),
    ...(hasOther ? ["other"] : []),
  ];
  const config: ChartConfig = Object.fromEntries([
    ...topMaterials.map(([, material], index) => [
      `m${index}`,
      { label: material.label, color: `var(--chart-${(index % 5) + 1})` },
    ]),
    ...(hasOther
      ? [["other", { label: "Other", color: "var(--muted-foreground)" }]]
      : []),
  ]);

  const data = CART_ROUTE_WORLDS.map((world) => {
    const row: Record<string, number | string> = { world };
    for (const key of keys) row[key] = 0;
    for (const material of calculation.materials) {
      const price = material.worldPrices.find((entry) => entry.world === world);
      const checkoutCost = price?.checkoutCost;
      if (typeof checkoutCost !== "number") continue;
      const materialKey = `${material.itemId}-${material.name}`;
      const dataKey = keyByMaterial.get(materialKey) ?? "other";
      if (dataKey in row) {
        row[dataKey] = Number(row[dataKey]) + checkoutCost;
      }
    }
    return row;
  });

  return { config, data, keys };
}
