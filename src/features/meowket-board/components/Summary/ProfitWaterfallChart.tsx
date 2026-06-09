import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import type { MeowketProfitResult } from "../../types";
import {
  formatGil,
  formatPercent,
  formatQuantity,
  shortGilWithUnit,
} from "../../utils/formatting";
import {
  profitChartColor,
  profitTooltip,
  shoppingCartCostTooltip,
} from "../../utils/profitDisplay";

type ProfitWaterfallDatum = {
  name: string;
  range: [number, number];
  value: number;
  fill: string;
  detail: string;
};

export function ProfitWaterfallChart({
  calculation,
}: {
  calculation: MeowketProfitResult;
}) {
  const data = profitWaterfallData(calculation);
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Total Profit</CardTitle>
        <CardDescription>
          Sale value, tax, material spend, and final profit.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col">
        <ChartContainer
          className="min-h-72 flex-1"
          config={{
            range: { label: "Gil", color: "var(--chart-1)" },
          }}
        >
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 12, right: 12, bottom: 8, left: 12 }}
            barCategoryGap="28%"
          >
            <CartesianGrid horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={shortGilWithUnit}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              dataKey="name"
              type="category"
              tickLine={false}
              axisLine={false}
              width={82}
            />
            <ChartTooltip content={<WaterfallTooltip />} cursor={false} />
            <Bar dataKey="range" radius={4}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function profitWaterfallData(
  calculation: MeowketProfitResult,
): ProfitWaterfallDatum[] {
  const sellRevenue = calculation.sellEstimate.totalRevenue ?? 0;
  const tax = calculation.sellEstimate.taxAmount ?? 0;
  const netRevenue = calculation.sellEstimate.netRevenue ?? sellRevenue - tax;
  const materials = calculation.estimatedMaterialCost ?? 0;
  const profit = calculation.estimatedNetProfit ?? netRevenue - materials;

  return [
    {
      name: "Sell revenue",
      range: [0, sellRevenue],
      value: sellRevenue,
      fill: "var(--chart-2)",
      detail: `${formatGil(calculation.sellEstimate.unitPrice)} x ${formatQuantity(calculation.item.sellQuantity)} = ${formatGil(sellRevenue)}`,
    },
    {
      name: "Tax",
      range: [netRevenue, sellRevenue],
      value: -tax,
      fill: "var(--destructive)",
      detail: `${formatGil(sellRevenue)} x ${formatPercent(calculation.sellEstimate.marketTaxRate * 100)} = ${formatGil(tax)}`,
    },
    {
      name: "Materials",
      range: [profit, netRevenue],
      value: -materials,
      fill: "var(--chart-4)",
      detail: shoppingCartCostTooltip(calculation),
    },
    {
      name: "Profit",
      range: profit >= 0 ? [0, profit] : [profit, 0],
      value: profit,
      fill: profitChartColor(profit),
      detail: profitTooltip(calculation),
    },
  ];
}

function WaterfallTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: ProfitWaterfallDatum }>;
}) {
  const item = payload?.[0]?.payload;
  if (!active || !item) return null;
  return (
    <div className="grid max-w-72 gap-1.5 rounded-lg border bg-background px-2.5 py-2 text-xs shadow-xl">
      <p className="font-medium">{item.name}</p>
      <p className="font-mono font-medium">{formatGil(item.value)}</p>
      <p className="text-muted-foreground">{item.detail}</p>
    </div>
  );
}
