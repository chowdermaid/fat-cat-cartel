import { useEffect, useRef } from "react";
import { Activity, Clock3, Timer } from "lucide-react";
import { animate, createScope, stagger } from "animejs";
import type { GameServerStatusResponse } from "../../types";

const PALWORLD_RAM_GB = 8;
const RING_RADIUS = 42;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

type PalworldServerUsageProps = {
  status: GameServerStatusResponse | null;
  now: number;
};

type UsageGaugeProps = {
  label: string;
  percent: number | null;
  value: string;
  detail: string;
};

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function formatDuration(ms: number, roundUp = false): string {
  const safeMs = Math.max(0, ms);
  const minutes = roundUp
    ? Math.ceil(safeMs / 60_000)
    : Math.floor(safeMs / 60_000);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${remainingMinutes}m`;
}

function uptimeText(
  status: GameServerStatusResponse | null,
  now: number,
): string {
  if (!status) return "Unavailable";
  if (status.status === "stopped" || status.status === "disabled") {
    return "Offline";
  }
  if (status.status !== "running" || !status.launchTime) {
    return "Unavailable";
  }
  const launchTime = new Date(status.launchTime).getTime();
  if (!Number.isFinite(launchTime)) return "Unavailable";
  return formatDuration(now - launchTime);
}

function autoStopText(
  status: GameServerStatusResponse | null,
  now: number,
): { value: string; detail: string } {
  if (!status) return { value: "Unavailable", detail: "No status data" };
  if (status.status === "pending") {
    return { value: "Server starting", detail: "Countdown not active" };
  }
  if (status.status === "stopping" || status.status === "shutting-down") {
    return { value: "Server stopping", detail: "Countdown ended" };
  }
  if (status.status !== "running") {
    return { value: "Server offline", detail: "Countdown not active" };
  }
  if (!status.idleSince || !status.autoStopEligibleAt) {
    return { value: "Not scheduled", detail: "Server is active" };
  }

  const remainingMs = Math.max(0, status.autoStopEligibleAt - now);
  const idleMs = Math.max(0, now - status.idleSince);
  return {
    value: formatDuration(remainingMs, true),
    detail: `Idle for ${formatDuration(idleMs)}`,
  };
}

function UsageGauge({
  label,
  percent,
  value,
  detail,
}: UsageGaugeProps) {
  const safePercent = percent === null ? 0 : clampPercent(percent);
  const targetOffset =
    RING_CIRCUMFERENCE - (safePercent / 100) * RING_CIRCUMFERENCE;

  return (
    <div className="pw-usage-item flex min-w-0 flex-col items-start gap-3 rounded-lg border bg-card px-3 py-3 sm:flex-row sm:items-center">
      <svg
        viewBox="0 0 100 100"
        className="h-20 w-20 shrink-0 -rotate-90"
        role="img"
        aria-label={`${label}: ${value}. ${detail}`}
      >
        <circle
          cx="50"
          cy="50"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="8"
          className="stroke-muted"
        />
        <circle
          data-usage-ring
          data-target-offset={targetOffset}
          cx="50"
          cy="50"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={targetOffset}
          className="stroke-cyan-500"
        />
      </svg>
      <div className="min-w-0">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className="mt-1 break-words text-lg font-semibold sm:text-xl">
          {value}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
      </div>
    </div>
  );
}

function UsageDetail({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Clock3;
}) {
  return (
    <div className="pw-usage-item min-w-0 rounded-lg border bg-card px-4 py-4">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="mt-3 break-words text-lg font-semibold sm:text-xl">
        {value}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
    </div>
  );
}

export function PalworldServerUsage({
  status,
  now,
}: PalworldServerUsageProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const isRunning = status?.status === "running";
  const memoryPercent =
    isRunning && typeof status.memoryUsedPercent === "number"
      ? clampPercent(status.memoryUsedPercent)
      : null;
  const memoryValue =
    memoryPercent === null ? "Unavailable" : `${memoryPercent.toFixed(1)}%`;
  const memoryDetail =
    memoryPercent === null
      ? "Telemetry unavailable"
      : `${((memoryPercent / 100) * PALWORLD_RAM_GB).toFixed(1)} of ${PALWORLD_RAM_GB} GB`;
  const uptime = uptimeText(status, now);
  const autoStop = autoStopText(status, now);

  useEffect(() => {
    if (!rootRef.current) return;
    const rings = rootRef.current.querySelectorAll<SVGCircleElement>(
      "[data-usage-ring]",
    );

    if (prefersReducedMotion()) {
      rings.forEach((ring) => {
        ring.style.strokeDashoffset = ring.dataset.targetOffset ?? "0";
      });
      return;
    }

    const scope = createScope({ root: rootRef }).add(() => {
      rings.forEach((ring) => {
        animate(ring, {
          strokeDashoffset: [
            RING_CIRCUMFERENCE,
            Number(ring.dataset.targetOffset),
          ],
          duration: 650,
          ease: "out(4)",
        });
      });
    });

    return () => scope.revert();
  }, [memoryPercent]);

  useEffect(() => {
    if (!rootRef.current || prefersReducedMotion()) return;
    const scope = createScope({ root: rootRef }).add(() => {
      animate(".pw-usage-item", {
        opacity: [0, 1],
        translateY: [8, 0],
        delay: stagger(55),
        duration: 360,
        ease: "out(3)",
      });
    });
    return () => scope.revert();
  }, []);

  return (
    <section ref={rootRef} className="space-y-3" aria-labelledby="server-usage-title">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Activity className="h-4 w-4 text-muted-foreground" />
        <h2 id="server-usage-title">Server Usage</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <UsageGauge
          label="RAM"
          percent={memoryPercent}
          value={memoryValue}
          detail={memoryDetail}
        />
        <UsageDetail
          label="Uptime"
          value={uptime}
          detail={isRunning ? "Current session" : "No active session"}
          icon={Clock3}
        />
        <UsageDetail
          label="Auto-stop"
          value={autoStop.value}
          detail={autoStop.detail}
          icon={Timer}
        />
      </div>
    </section>
  );
}
