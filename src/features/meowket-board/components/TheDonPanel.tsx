import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import professorCat from "@/assets/fatcat/professorcat.png";
import type { MeowketProfitResult } from "../types";
import {
  formatDecimal,
  formatGil,
  formatQuantity,
  formatSaleTime,
} from "../utils/formatting";
import {
  confidenceBadgeVariant,
  confidenceLabel,
  confidenceVerdictLabel,
} from "../utils/marketDisplay";
import { useEntranceAnimation } from "../hooks/useMeowketAnimations";

export function TheDonPanel({ calculation }: { calculation: MeowketProfitResult }) {
  const confidence = calculation.sellConfidence;
  const panelRef = useEntranceAnimation<HTMLDivElement>(
    [confidence.verdict, confidence.label, confidence.salesCount],
    { translateY: 6, duration: 260 },
  );
  return (
    <div ref={panelRef} className="h-full min-h-36 overflow-hidden">
      <div className="grid h-full gap-4 p-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(15rem,0.95fr)] md:items-center">
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative shrink-0">
            <img
              src={professorCat}
              alt=""
              className="h-24 w-24 rounded-lg border bg-background object-cover md:h-28 md:w-28"
              loading="lazy"
            />
            <span className="absolute -bottom-2 left-2 rounded-md border bg-background px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
              The Don
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                The Don says
              </p>
              <Badge variant={confidenceBadgeVariant(confidence.label)}>
                {confidenceLabel(confidence.label)}
              </Badge>
            </div>
            <p className="mt-2 text-lg font-semibold leading-tight">
              {confidenceVerdictLabel(confidence.verdict)}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {confidence.demandComment}
            </p>
          </div>
        </div>
        <Separator className="hidden h-28 md:block" orientation="vertical" />
        <Separator className="md:hidden" />
        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
          <DonMetric
            label="30d sales"
            value={formatQuantity(confidence.salesCount)}
          />
          <DonMetric
            label="Units sold"
            value={formatQuantity(confidence.unitsSold)}
          />
          <DonMetric
            label="Sales/day"
            value={formatDecimal(confidence.salesPerDay)}
          />
          <DonMetric
            label="Units/day"
            value={formatDecimal(confidence.unitsPerDay)}
          />
          <DonMetric
            label="Last sale"
            value={formatSaleTime(confidence.lastSaleTime)}
          />
          <DonMetric
            label="Median"
            value={formatGil(confidence.medianSalePrice)}
          />
        </div>
      </div>
    </div>
  );
}

function DonMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border bg-muted/20 px-2 py-1.5">
      <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="truncate font-medium">{value}</p>
    </div>
  );
}
