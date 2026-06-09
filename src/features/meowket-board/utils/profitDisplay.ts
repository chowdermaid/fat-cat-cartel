import type { MeowketCartGroup, MeowketCartSummary, MeowketProfitResult } from "../types";
import { formatGil, formatPercent } from "./formatting";

export function shoppingCartCostTooltip(calculation: MeowketProfitResult) {
  if (calculation.estimatedMaterialCost === null) {
    return "At least one material has no complete shopping cart.";
  }
  const parts = calculation.materials
    .filter((material) => typeof material.estimatedTotalCost === "number")
    .map(
      (material) =>
        `${material.name}: ${formatGil(material.estimatedTotalCost)}`,
    );
  return `${parts.slice(0, 6).join(" + ")}${parts.length > 6 ? " + ..." : ""} = ${formatGil(calculation.estimatedMaterialCost)}`;
}

export function profitTooltip(calculation: MeowketProfitResult) {
  if (
    calculation.sellEstimate.netRevenue === null ||
    calculation.estimatedMaterialCost === null ||
    calculation.estimatedNetProfit === null
  ) {
    return "Profit needs taxed revenue and a complete shopping cart.";
  }
  return `${formatGil(calculation.sellEstimate.netRevenue)} after tax - ${formatGil(calculation.estimatedMaterialCost)} shopping cart cost = ${formatGil(calculation.estimatedNetProfit)} profit`;
}

export function shoppingCostDetail(calculation: MeowketProfitResult) {
  const stackCount = calculation.cheapestShoppingList.reduce(
    (total, group) => total + group.items.length,
    0,
  );
  const worldCount = calculation.cheapestShoppingList.length;
  return `${stackCount} stack${stackCount === 1 ? "" : "s"} across ${worldCount} world${worldCount === 1 ? "" : "s"}. Gil needed now.`;
}

export function profitDetail(calculation: MeowketProfitResult) {
  const netRevenue = calculation.sellEstimate.netRevenue;
  const margin =
    typeof calculation.estimatedNetProfit === "number" &&
    typeof netRevenue === "number" &&
    netRevenue > 0
      ? (calculation.estimatedNetProfit / netRevenue) * 100
      : null;
  const perCraft =
    typeof calculation.estimatedNetProfit === "number"
      ? calculation.estimatedNetProfit / calculation.item.craftsRequired
      : null;
  return `${formatPercent(margin)} margin. ${formatGil(perCraft)} per craft.`;
}

export function profitToneClass(value: number | null | undefined) {
  if (typeof value !== "number") return "text-muted-foreground";
  if (value > 0) return "text-emerald-600 dark:text-emerald-400";
  if (value < 0) return "text-destructive";
  return "text-muted-foreground";
}

export function profitChartColor(value: number | null | undefined) {
  if (typeof value !== "number") return "var(--muted-foreground)";
  if (value > 0) return "rgb(5 150 105)";
  if (value < 0) return "var(--destructive)";
  return "var(--muted-foreground)";
}

export function cartSellValueTooltip(summary: MeowketCartSummary) {
  return `Batch sell revenues = ${formatGil(summary.sellRevenue)}`;
}

export function cartProfitTooltip(summary: MeowketCartSummary) {
  return `${formatGil(summary.netRevenue)} after tax - ${formatGil(summary.materialCost)} shopping cart cost = ${formatGil(summary.netProfit)} profit`;
}

export function cartWorldTotalTooltip(group: MeowketCartGroup) {
  const parts = group.items.map(
    (item) => `${item.name}: ${formatGil(item.totalPrice)}`,
  );
  return `${parts.slice(0, 6).join(" + ")}${parts.length > 6 ? " + ..." : ""} = ${formatGil(group.worldTotal)}`;
}
