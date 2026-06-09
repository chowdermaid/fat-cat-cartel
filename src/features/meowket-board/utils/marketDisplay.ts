import type { MeowketProfitResult } from "../types";
import { formatGil, formatUploadTime } from "./formatting";

export function sellEstimateTooltip(calculation: MeowketProfitResult) {
  const price = calculation.finalItemPrices.find(
    (entry) => entry.world === calculation.sellEstimate.world,
  );
  const source =
    calculation.sellEstimate.source === "fallback_world_lowest_listing"
      ? "No Sophia entries. Using fallback world lowest listing."
      : calculation.sellEstimate.source === "sophia_average_lowest_twenty"
        ? "Using Sophia average of lowest 20 listings."
        : "Using Sophia lowest listing.";
  return [
    source,
    `World: ${calculation.sellEstimate.world}`,
    `Lowest: ${formatGil(price?.lowestPricePerUnit ?? null)}`,
    `Avg low 20: ${formatGil(price?.averageLowestTwentyPricePerUnit ?? null)}`,
    `Available: ${price?.quantityAvailable?.toLocaleString() ?? "-"}`,
    `Listings: ${price?.listingCount?.toLocaleString() ?? "-"}`,
    `Updated: ${formatUploadTime(price?.lastUploadTime)}`,
  ].join(" ");
}

export function confidenceBadgeVariant(
  label: MeowketProfitResult["sellConfidence"]["label"] | undefined,
) {
  if (label === "likely") return "default";
  if (label === "moderate") return "secondary";
  if (label === "risky") return "destructive";
  return "outline";
}

export function confidenceLabel(
  label: MeowketProfitResult["sellConfidence"]["label"],
) {
  const labels = {
    likely: "Good signal",
    moderate: "Watch margin",
    risky: "High risk",
    unknown: "Missing data",
  } satisfies Record<MeowketProfitResult["sellConfidence"]["label"], string>;
  return labels[label];
}

export function confidenceVerdictLabel(
  verdict: MeowketProfitResult["sellConfidence"]["verdict"],
) {
  const labels = {
    worth_crafting: "Worth crafting",
    thin_margin: "Thin margin",
    not_worth: "Not worth crafting",
    missing_prices: "Missing prices",
  } satisfies Record<MeowketProfitResult["sellConfidence"]["verdict"], string>;
  return labels[verdict];
}

export function sellEstimateDetail(calculation: MeowketProfitResult) {
  const price = calculation.finalItemPrices.find(
    (entry) => entry.world === calculation.sellEstimate.world,
  );
  return `Avg low 20 ${formatGil(price?.averageLowestTwentyPricePerUnit ?? null)}. ${price?.listingCount?.toLocaleString() ?? "-"} listings.`;
}
