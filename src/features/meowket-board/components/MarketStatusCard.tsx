import { Badge } from "@/components/ui/badge";
import type { MeowketProfitResult } from "../types";
import { formatRelativeTime } from "../utils/formatting";
import { materialSupplyStatus } from "../utils/materialDisplay";

export function MarketStatusCard({
  calculation,
  lastCalculatedAt,
}: {
  calculation: MeowketProfitResult | null;
  lastCalculatedAt: number | null;
}) {
  const fallbackEstimate =
    calculation?.sellEstimate.source === "fallback_world_lowest_listing";
  const staleCount =
    calculation?.warnings.filter((warning) =>
      warning.includes("older than 24 hours"),
    ).length ?? 0;
  const materialStatuses =
    calculation?.materials.map((material) => materialSupplyStatus(material)) ??
    [];
  const hasShortSupply = materialStatuses.some(
    (status) => status.label === "Short supply",
  );
  const hasListingCapRisk = materialStatuses.some(
    (status) => status.label === "Listing cap risk",
  );
  const statusLabel = !calculation
    ? "Unchecked"
    : hasShortSupply
      ? "Short supply"
      : fallbackEstimate
        ? "Fallback"
        : staleCount > 0
          ? "Stale prices"
          : hasListingCapRisk
            ? "Listing cap risk"
            : "Ready";
  const statusVariant = !calculation
    ? "outline"
    : hasShortSupply
      ? "destructive"
      : fallbackEstimate || staleCount > 0 || hasListingCapRisk
        ? "secondary"
        : "default";

  return (
    <div className="flex h-full min-h-36 flex-col justify-center rounded-lg border bg-card p-3 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Market status</p>
          <p className="text-xs text-muted-foreground">
            {calculation
              ? "Current pricing data quality"
              : "Calculate to check market data"}
          </p>
        </div>
        <Badge variant={statusVariant}>{statusLabel}</Badge>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <StatusMetric
          label="Checked"
          value={lastCalculatedAt ? formatRelativeTime(lastCalculatedAt) : "-"}
          description="Last refresh"
        />
        <StatusMetric
          label="Material supply"
          value={
            !calculation
              ? "-"
              : hasShortSupply
                ? "Short"
                : hasListingCapRisk
                  ? "Cap risk"
                  : "Covered"
          }
          description="Can buy missing mats"
        />
        <StatusMetric
          label="Price age"
          value={!calculation ? "-" : staleCount > 0 ? `${staleCount} stale` : "OK"}
          description="Fresh data under 24 hrs old"
        />
      </div>
    </div>
  );
}

function StatusMetric({
  description,
  label,
  value,
}: {
  description: string;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-md bg-muted/40 px-2 py-1.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-semibold tabular-nums">
        {value}
      </p>
      <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
