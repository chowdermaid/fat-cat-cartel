import { Link } from "@tanstack/react-router";
import { ArrowLeft, Power, RefreshCw, Server, Users } from "lucide-react";
import palworldHero from "@/assets/gameserver/palworld-banner.jpg";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { GameServerStatus, GameServerStatusResponse } from "../../types";

type PalworldServerHeroProps = {
  status: GameServerStatusResponse | null;
  statusLabel: string;
  playersLabel: string;
  loadingStatus: boolean;
  actionLoading: "start" | "stop" | null;
  onRefresh: () => void;
  onStart: () => void;
  onStop: () => void;
};

function stateTheme(status: GameServerStatus | undefined): {
  badge: string;
  control: string;
  feedback: string;
  frame: string;
  indicator: string;
  label: string;
} {
  if (status === "running") {
    return {
      badge: "border-emerald-300/30 bg-emerald-400/15 text-emerald-100",
      control: "border-emerald-200/70 bg-emerald-300/20 text-emerald-50",
      feedback: "bg-emerald-300/30",
      frame: "border-emerald-300/30",
      indicator: "bg-emerald-300",
      label: "Online",
    };
  }
  if (
    status === "pending" ||
    status === "stopping" ||
    status === "shutting-down"
  ) {
    return {
      badge: "border-amber-300/30 bg-amber-400/15 text-amber-100",
      control: "border-amber-200/70 bg-amber-300/20 text-amber-50",
      feedback: "bg-amber-300/30",
      frame: "border-amber-300/30",
      indicator: "bg-amber-300",
      label: status === "pending" ? "Starting" : "Stopping",
    };
  }
  if (status === "terminated" || status === "unavailable") {
    return {
      badge: "border-red-300/30 bg-red-400/15 text-red-100",
      control: "border-red-200/70 bg-red-300/20 text-red-50",
      feedback: "bg-red-300/35",
      frame: "border-red-300/35",
      indicator: "bg-red-300",
      label: "Attention",
    };
  }
  return {
    badge: "border-white/20 bg-white/10 text-slate-100",
    control: "border-slate-200/45 bg-slate-300/10 text-slate-50",
    feedback: "bg-slate-200/20",
    frame: "border-white/15",
    indicator: "bg-slate-300",
    label:
      status === "disabled"
        ? "Disabled"
        : status === "stopped"
          ? "Offline"
          : "Unknown",
  };
}

export function PalworldServerHero({
  status,
  statusLabel,
  playersLabel,
  loadingStatus,
  actionLoading,
  onRefresh,
  onStart,
  onStop,
}: PalworldServerHeroProps) {
  const theme = stateTheme(status?.status);
  const startAvailable = status?.status === "stopped" && status.enabled;
  const stopAvailable = status?.status === "running" && status.enabled;
  const busy =
    actionLoading !== null ||
    status?.status === "pending" ||
    status?.status === "stopping" ||
    status?.status === "shutting-down";

  return (
    <section
      className={`relative isolate min-h-[25rem] overflow-hidden rounded-xl border bg-slate-950 text-white shadow-xl ${theme.frame}`}
      aria-labelledby="palworld-server-title"
    >
      <img
        src={palworldHero}
        alt=""
        aria-hidden="true"
        className={`pw-hero-art absolute inset-0 h-full w-full object-cover transition-[filter,opacity] duration-500 motion-reduce:transition-none ${
          status?.status === "stopped" ? "opacity-55 grayscale" : ""
        }`}
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.96)_0%,rgba(2,6,23,0.82)_42%,rgba(2,6,23,0.4)_72%,rgba(2,6,23,0.72)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(2,6,23,0.82)_0%,transparent_55%)]" />
      <div
        className="pw-hero-start-flash pointer-events-none absolute inset-0 bg-cyan-100/25 opacity-0 mix-blend-screen"
        aria-hidden="true"
      />
      <div
        className="pw-hero-stop-shade pointer-events-none absolute inset-0 bg-slate-950 opacity-0"
        aria-hidden="true"
      />
      <div
        className={`pw-state-feedback pointer-events-none absolute inset-0 opacity-0 mix-blend-screen ${theme.feedback}`}
        aria-hidden="true"
      />
      <div
        className={`pw-state-sweep pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 opacity-0 blur-2xl ${theme.feedback}`}
        aria-hidden="true"
      />

      <div className="relative grid min-h-[25rem] gap-8 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-center lg:p-10">
        <div className="max-w-2xl space-y-6">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="pw-hero-reveal w-fit px-0 text-slate-200 hover:bg-transparent hover:text-white"
          >
            <Link to="/gameserver">
              <ArrowLeft className="h-4 w-4" />
              Game Servers
            </Link>
          </Button>

          <div className="space-y-3">
            <Badge
              variant="outline"
              className={`pw-hero-reveal pw-hero-state-copy gap-2 ${theme.badge}`}
            >
              <span className={`h-2 w-2 rounded-full ${theme.indicator}`} />
              {theme.label}
            </Badge>
            <div className="pw-hero-reveal space-y-2">
              <p className="text-sm font-medium text-slate-300">
                jeff bezos simulator
              </p>
              <h1
                id="palworld-server-title"
                className="font-serif text-4xl font-black tracking-tight sm:text-5xl"
              >
                Palworld Server
              </h1>
              <p
                className="pw-hero-state-copy max-w-xl text-base text-slate-200"
                aria-live="polite"
              >
                {status?.disabledMessage ||
                  status?.message ||
                  "Checking server status."}
              </p>
            </div>
          </div>

          <div className="pw-hero-reveal flex flex-wrap gap-3">
            <div className="pw-hero-status-item flex items-center gap-2 rounded-md border border-white/15 bg-slate-950/45 px-3 py-2 backdrop-blur-sm">
              <Server className="h-4 w-4 text-cyan-200" />
              <div>
                <div className="text-[0.65rem] tracking-wider text-slate-400 uppercase">
                  State
                </div>
                <div className="pw-hero-state-copy text-sm font-semibold">
                  {statusLabel}
                </div>
              </div>
            </div>
            <div className="pw-hero-status-item flex items-center gap-2 rounded-md border border-white/15 bg-slate-950/45 px-3 py-2 backdrop-blur-sm">
              <Users className="h-4 w-4 text-cyan-200" />
              <div>
                <div className="text-[0.65rem] tracking-wider text-slate-400 uppercase">
                  Players
                </div>
                <div className="text-sm font-semibold">{playersLabel}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="pw-hero-reveal flex flex-col items-center gap-4 rounded-xl border border-white/10 bg-slate-950/35 p-6 backdrop-blur-sm">
          <div className="pw-server-control relative flex h-36 w-36 items-center justify-center rounded-full border border-white/15 bg-slate-950/35">
            <span
              className="pw-control-impact-ring pointer-events-none absolute inset-2 rounded-full border border-cyan-100/70 opacity-0"
              aria-hidden="true"
            />
            <span
              className="pw-control-impact-ring pointer-events-none absolute inset-2 rounded-full border border-white/45 opacity-0"
              aria-hidden="true"
            />
            <svg
              className="pointer-events-none absolute inset-1 h-[calc(100%-0.5rem)] w-[calc(100%-0.5rem)] -rotate-90 overflow-visible text-emerald-300"
              viewBox="0 0 100 100"
              aria-hidden="true"
            >
              <circle
                className="pw-control-ready-ring opacity-0"
                cx="50"
                cy="50"
                r="48"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                pathLength="1"
                strokeDasharray="1"
                strokeDashoffset="1"
              />
            </svg>
            <span
              className={`pw-server-control-status absolute right-3 top-3 h-3 w-3 rounded-full ${theme.indicator}`}
            />
            <Button
              type="button"
              size="icon"
              className={`pw-server-control-button relative h-24 w-24 rounded-full border-2 transition-colors active:scale-95 ${theme.control}`}
              onClick={
                startAvailable ? onStart : stopAvailable ? onStop : undefined
              }
              disabled={busy || (!startAvailable && !stopAvailable)}
              aria-label={
                startAvailable
                  ? "Start Palworld server"
                  : stopAvailable
                    ? "Stop Palworld server"
                    : `Palworld server ${statusLabel}`
              }
            >
              <Power className="h-10 w-10" />
            </Button>
          </div>
          <div className="text-center">
            <div className="text-xs font-medium text-slate-400 uppercase">
              Server control
            </div>
            <div className="mt-1 text-sm font-semibold">
              {actionLoading === "start"
                ? "Starting server"
                : actionLoading === "stop"
                  ? "Stopping server"
                  : startAvailable
                    ? "Press to start"
                    : stopAvailable
                      ? "Press to stop"
                      : statusLabel}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="border border-white/10 bg-slate-950/30 text-slate-200 hover:bg-white/10 hover:text-white"
            disabled={loadingStatus || actionLoading !== null}
            onClick={onRefresh}
          >
            <RefreshCw
              className={`h-4 w-4 ${loadingStatus ? "animate-spin" : ""}`}
            />
            {loadingStatus ? "Refreshing" : "Refresh status"}
          </Button>
        </div>
      </div>
    </section>
  );
}
