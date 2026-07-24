import { useEffect, useRef } from "react";
import { Check, Circle, LoaderCircle } from "lucide-react";
import { animate, createScope, stagger } from "animejs";
import type { GameServerStatusResponse } from "../../types";

type PalworldStartupStatusProps = {
  status: GameServerStatusResponse | null;
  starting: boolean;
};

type StageState = "waiting" | "active" | "complete";

type StartupStage = {
  label: string;
  detail: string;
  state: StageState;
};

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function startupStages(
  status: GameServerStatusResponse | null,
  starting: boolean,
): StartupStage[] {
  const requestAccepted =
    status?.status === "pending" ||
    status?.status === "running" ||
    Boolean(status?.connectAddress);
  const serverRunning = status?.status === "running";
  const addressReady = serverRunning && Boolean(status.connectAddress);

  return [
    {
      label: "Start requested",
      detail: requestAccepted ? "Request accepted" : "Sending request",
      state: requestAccepted ? "complete" : starting ? "active" : "waiting",
    },
    {
      label: "Server starting",
      detail: serverRunning
        ? "Server is responding"
        : status?.message || "Waiting for server",
      state: serverRunning
        ? "complete"
        : requestAccepted
          ? "active"
          : "waiting",
    },
    {
      label: "Connection ready",
      detail: addressReady
        ? status.connectAddress ?? "Address ready"
        : "Waiting for address",
      state: addressReady
        ? "complete"
        : serverRunning
          ? "active"
          : "waiting",
    },
  ];
}

function StageIcon({ state }: { state: StageState }) {
  if (state === "complete") {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
        <Check className="h-4 w-4" />
      </span>
    );
  }
  if (state === "active") {
    return (
      <span className="pw-startup-active flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
        <LoaderCircle className="h-4 w-4" />
      </span>
    );
  }
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground">
      <Circle className="h-3 w-3" />
    </span>
  );
}

export function PalworldStartupStatus({
  status,
  starting,
}: PalworldStartupStatusProps) {
  const rootRef = useRef<HTMLElement>(null);
  const stages = startupStages(status, starting);
  const ready = stages.every((stage) => stage.state === "complete");

  useEffect(() => {
    if (!rootRef.current || prefersReducedMotion()) return;
    const scope = createScope({ root: rootRef }).add(() => {
      animate(".pw-startup-stage", {
        opacity: [0, 1],
        translateY: [6, 0],
        delay: stagger(70),
        duration: 320,
        ease: "out(3)",
      });
    });
    return () => scope.revert();
  }, []);

  useEffect(() => {
    if (!rootRef.current || prefersReducedMotion()) return;
    const scope = createScope({ root: rootRef }).add(() => {
      animate(".pw-startup-active", {
        scale: [0.92, 1.08],
        opacity: [0.72, 1],
        duration: 720,
        alternate: true,
        loop: true,
        ease: "inOutSine",
      });
    });
    return () => scope.revert();
  }, [status?.status, status?.connectAddress]);

  return (
    <section
      ref={rootRef}
      className="rounded-lg border bg-muted/30 p-4"
      aria-labelledby="palworld-startup-title"
      aria-live="polite"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id="palworld-startup-title" className="text-sm font-semibold">
          Starting Palworld
        </h2>
        <span
          className={`text-xs font-medium ${ready ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}
        >
          {ready ? "Ready to join" : "Please wait"}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {stages.map((stage) => (
          <div
            key={stage.label}
            className="pw-startup-stage flex min-w-0 items-start gap-3 rounded-md border bg-background/80 p-3"
          >
            <StageIcon state={stage.state} />
            <div className="min-w-0">
              <div className="text-sm font-medium">{stage.label}</div>
              <div className="mt-1 break-words text-xs text-muted-foreground">
                {stage.detail}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
