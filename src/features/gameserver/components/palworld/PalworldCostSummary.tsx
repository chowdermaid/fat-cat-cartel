import { useEffect, useRef } from "react";
import { CircleDollarSign } from "lucide-react";
import { animate, createScope, stagger } from "animejs";
import type { GameServerStatusResponse } from "../../types";

type PalworldCostSummaryProps = {
  status: GameServerStatusResponse | null;
  now: number;
};

const INSTANCE_PRICES_AUD: Record<string, number> = {
  "t3a.large": 0.15,
  "t3a.xlarge": 0.3,
};

type CostValueKey = "session" | "hourly" | "current" | "previous";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function formatAud(value: number | null, approximate = false): string {
  if (value === null) return "Unavailable";
  return `${approximate ? "~" : ""}A$${value.toFixed(2)}`;
}

function formatMonthLabel(
  monthKey: string | null | undefined,
  fallback: string,
): string {
  if (!monthKey) return fallback;
  const [year, month] = monthKey.split("-").map((part) => Number(part));
  if (!year || !month) return monthKey;
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString(undefined, {
    month: "short",
    year: "numeric",
  });
}

function hourlyRate(status: GameServerStatusResponse | null): number | null {
  if (typeof status?.monthlyCost?.hourlyRateAud === "number") {
    return status.monthlyCost.hourlyRateAud;
  }
  if (!status?.instanceType) return null;
  return INSTANCE_PRICES_AUD[status.instanceType] ?? null;
}

function sessionCost(
  status: GameServerStatusResponse | null,
  now: number,
  rate: number | null,
): number | null {
  if (status?.status !== "running" || !status.launchTime || rate === null) {
    return null;
  }
  const launchedAt = new Date(status.launchTime).getTime();
  if (!Number.isFinite(launchedAt)) return null;
  return Math.max(0, now - launchedAt) / 3_600_000 * rate;
}

function animatedValue(
  key: CostValueKey,
  value: number,
): string {
  if (key === "hourly") return `${formatAud(value)}/hr`;
  return formatAud(value, key === "session");
}

export function PalworldCostSummary({
  status,
  now,
}: PalworldCostSummaryProps) {
  const rootRef = useRef<HTMLElement>(null);
  const previousValuesRef = useRef<Partial<Record<CostValueKey, number>>>({});
  const rate = hourlyRate(status);
  const session = sessionCost(status, now, rate);
  const currentMonth = status?.monthlyCost?.estimatedComputeAud ?? null;
  const previousMonth = status?.previousMonthCost?.estimatedComputeAud ?? null;
  const comparisonMax = Math.max(currentMonth ?? 0, previousMonth ?? 0);
  const currentWidth =
    comparisonMax > 0 && currentMonth !== null
      ? currentMonth / comparisonMax * 100
      : 0;
  const previousWidth =
    comparisonMax > 0 && previousMonth !== null
      ? previousMonth / comparisonMax * 100
      : 0;

  useEffect(() => {
    if (!rootRef.current || prefersReducedMotion()) return;
    const scope = createScope({ root: rootRef }).add(() => {
      animate(".pw-cost-reveal", {
        opacity: [0, 1],
        translateY: [8, 0],
        delay: stagger(70),
        duration: 380,
        ease: "out(4)",
      });
    });
    return () => scope.revert();
  }, []);

  useEffect(() => {
    const values: Record<CostValueKey, number | null> = {
      session,
      hourly: rate,
      current: currentMonth,
      previous: previousMonth,
    };

    if (!rootRef.current || prefersReducedMotion()) {
      previousValuesRef.current = Object.fromEntries(
        Object.entries(values).filter((entry) => entry[1] !== null),
      );
      return;
    }

    const scope = createScope({ root: rootRef }).add(() => {
      for (const [key, value] of Object.entries(values) as Array<
        [CostValueKey, number | null]
      >) {
        if (value === null) continue;
        const element = rootRef.current?.querySelector<HTMLElement>(
          `[data-cost-value="${key}"]`,
        );
        if (!element) continue;
        const counter = {
          value: previousValuesRef.current[key] ?? 0,
        };
        animate(counter, {
          value,
          duration: 520,
          ease: "out(3)",
          onUpdate: () => {
            element.textContent = animatedValue(key, counter.value);
          },
        });
      }
    });

    previousValuesRef.current = Object.fromEntries(
      Object.entries(values).filter((entry) => entry[1] !== null),
    );
    return () => scope.revert();
  }, [currentMonth, previousMonth, rate, session]);

  useEffect(() => {
    if (!rootRef.current || prefersReducedMotion()) return;
    const scope = createScope({ root: rootRef }).add(() => {
      animate(".pw-cost-bar", {
        scaleX: [0, 1],
        duration: 620,
        delay: stagger(90),
        ease: "out(4)",
      });
    });
    return () => scope.revert();
  }, [currentMonth, previousMonth]);

  return (
    <section
      ref={rootRef}
      className="space-y-3"
      aria-labelledby="palworld-cost-title"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2
            id="palworld-cost-title"
            className="flex items-center gap-2 text-sm font-semibold"
          >
            <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
            Estimated cost
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Compute estimates in Australian dollars.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="pw-cost-reveal rounded-md border px-3 py-3">
          <div className="text-xs text-muted-foreground">Current session</div>
          <div
            data-cost-value="session"
            className="mt-1 text-xl font-semibold tabular-nums"
          >
            {formatAud(session, true)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {status?.status === "running"
              ? "Updates every 30 seconds"
              : "Server is not running"}
          </div>
        </div>

        <div className="pw-cost-reveal rounded-md border px-3 py-3">
          <div className="text-xs text-muted-foreground">Hourly rate</div>
          <div
            data-cost-value="hourly"
            className="mt-1 text-xl font-semibold tabular-nums"
          >
            {rate === null ? "Unknown rate" : `${formatAud(rate)}/hr`}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {status?.instanceType ?? "Instance type unavailable"}
          </div>
        </div>
      </div>

      <div className="pw-cost-reveal rounded-md border p-3">
        <div className="mb-3 text-xs font-medium">Monthly comparison</div>
        <div className="space-y-4">
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground">
                {formatMonthLabel(status?.monthlyCost?.monthKey, "This month")}
              </span>
              <span
                data-cost-value="current"
                className="font-semibold tabular-nums"
              >
                {formatAud(currentMonth)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="pw-cost-bar h-full origin-left rounded-full bg-emerald-500"
                style={{ width: `${currentWidth}%` }}
              />
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground">
                {formatMonthLabel(
                  status?.previousMonthCost?.monthKey,
                  "Previous month",
                )}
              </span>
              <span
                data-cost-value="previous"
                className="font-semibold tabular-nums"
              >
                {formatAud(previousMonth)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="pw-cost-bar h-full origin-left rounded-full bg-slate-400 dark:bg-slate-500"
                style={{ width: `${previousWidth}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
