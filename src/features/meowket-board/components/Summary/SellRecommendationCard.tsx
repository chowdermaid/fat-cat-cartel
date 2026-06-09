import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TARGET_SELL_WORLD } from "../../constants";
import type { MeowketProfitResult } from "../../types";
import { formatGil, formatPercent, formatQuantity } from "../../utils/formatting";
import {
  profitToneClass,
  profitTooltip,
  shoppingCartCostTooltip,
} from "../../utils/profitDisplay";
import { MathTooltip } from "../MathTooltip";
import { SellPriceByWorldChart } from "./SellPriceByWorldChart";

export function SellRecommendationCard({
  calculation,
  onRecalculate,
}: {
  calculation: MeowketProfitResult;
  onRecalculate: () => void;
}) {
  const netProfit = calculation.estimatedNetProfit;
  const netRevenue = calculation.sellEstimate.netRevenue;
  const margin =
    typeof netProfit === "number" &&
    typeof netRevenue === "number" &&
    netRevenue > 0
      ? (netProfit / netRevenue) * 100
      : null;
  const costPerCraft =
    typeof calculation.estimatedMaterialCost === "number"
      ? calculation.estimatedMaterialCost / calculation.item.craftsRequired
      : null;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle>Sell recommendation</CardTitle>
          <CardDescription>
            Price after market tax, margin, and per-craft yield.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRecalculate}
          >
            Refresh prices
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <div className="rounded-lg border bg-primary/5 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              List around
            </p>
            <p className="mt-2 text-3xl font-bold">
              {formatGil(calculation.sellEstimate.recommendedUnitPrice)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {TARGET_SELL_WORLD} -{" "}
              {formatQuantity(calculation.item.sellQuantity)} items -{" "}
              {formatPercent(calculation.sellEstimate.marketTaxRate * 100)} tax
              included
            </p>
          </div>

          <div className="grid gap-2 rounded-lg border p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Revenue equation
              </p>
              <p className="text-xs text-muted-foreground">
                Taxed Sophia revenue minus actual buy cost.
              </p>
            </div>
            <div className="grid min-w-0 gap-2 text-sm sm:grid-cols-2 2xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] 2xl:items-center">
              <EquationPart
                label="Sell revenue"
                value={formatGil(calculation.sellEstimate.totalRevenue)}
              />
              <EquationOperator value="-" />
              <EquationPart
                label="Tax"
                value={formatGil(calculation.sellEstimate.taxAmount)}
              />
              <EquationOperator value="-" />
              <EquationPart
                label="Materials"
                value={formatGil(calculation.estimatedMaterialCost)}
                tooltip={shoppingCartCostTooltip(calculation)}
              />
              <EquationOperator value="=" />
              <EquationPart
                label="Profit"
                value={formatGil(netProfit)}
                valueClassName={profitToneClass(netProfit)}
                tooltip={profitTooltip(calculation)}
                strong
              />
            </div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <InlineMetric
            label="Requested minimum"
            value={formatQuantity(calculation.item.requestedQuantity)}
          />
          <InlineMetric
            label="Crafts needed"
            value={formatQuantity(calculation.item.craftsRequired)}
          />
          <InlineMetric
            label="Sell quantity"
            value={formatQuantity(calculation.item.sellQuantity)}
          />
          <InlineMetric
            label="After-tax revenue"
            value={formatGil(netRevenue)}
          />
          <InlineMetric label="Margin" value={formatPercent(margin)} />
          <InlineMetric
            label="Cost per craft"
            value={formatGil(costPerCraft)}
          />
        </div>
        <SellPriceByWorldChart calculation={calculation} />
      </CardContent>
    </Card>
  );
}

function EquationPart({
  label,
  strong = false,
  tooltip,
  value,
  valueClassName,
}: {
  label: string;
  strong?: boolean;
  tooltip?: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0 rounded-md bg-muted/30 p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <MathTooltip content={tooltip}>
        <p
          className={`truncate font-mono ${strong ? "text-base font-semibold xl:text-lg" : "font-medium"} ${valueClassName ?? ""}`}
          title={value}
        >
          {value}
        </p>
      </MathTooltip>
    </div>
  );
}

function EquationOperator({ value }: { value: string }) {
  return (
    <span className="hidden text-center text-muted-foreground 2xl:block">
      {value}
    </span>
  );
}

function InlineMetric({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-md border bg-muted/20 p-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`truncate text-sm font-medium ${valueClassName ?? ""}`}>
        {value}
      </p>
    </div>
  );
}
