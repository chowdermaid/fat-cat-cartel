import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Copy,
  Power,
  PowerOff,
  RefreshCw,
  Server,
  Sprout,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { AuthAccessState } from "@/components/auth/AuthAccessState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useGameServerAuth } from "../hooks/useGameServerAuth";
import { useDragonwildsServer } from "../hooks/useDragonwildsServer";
import {
  canDragonwildsAct,
  checkedTime,
  dragonwildsStatusLabel,
  memoryLabel,
  onlineLabel,
  uptimeLabel,
} from "../utils/dragonwilds";
import { DragonwildsActivity } from "./dragonwilds/DragonwildsActivity";
import { DragonwildsConnectionPanel } from "./dragonwilds/DragonwildsConnectionPanel";
import dragonwildsHero from "@/assets/gameserver/runescape-banner.jpg";

const DRAGONWILDS_PASSWORD = "123";

function DragonwildsDashboard({
  server,
}: {
  server: ReturnType<typeof useDragonwildsServer>;
}) {
  const { state, refreshStatus, refreshEvents, runAction } = server;
  const [stopOpen, setStopOpen] = useState(false);
  const { status } = state;
  const canStop = canDragonwildsAct(state, "stop");
  const enabled = status?.enabled === true;
  const running = enabled && status?.status === "running";
  const worldName = enabled && !state.error ? status?.worldName?.trim() : null;
  const connectionAddress =
    running && !state.error ? status?.connectAddress : null;
  async function copyWorldName() {
    if (!worldName) return;
    try {
      await navigator.clipboard.writeText(worldName);
      toast.success("World name copied.");
    } catch {
      toast.error("Could not copy world name.");
    }
  }
  async function copyText(value: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(successMessage);
    } catch {
      toast.error("Could not copy.");
    }
  }
  return (
    <div className="space-y-6">
      <section
        className="relative isolate overflow-hidden rounded-xl border border-emerald-400/25 bg-slate-950 text-white shadow-xl"
        aria-labelledby="dragonwilds-title"
      >
        <img
          src={dragonwildsHero}
          alt=""
          aria-hidden="true"
          className={`absolute inset-0 h-full w-full object-cover transition-[filter,opacity] duration-500 motion-reduce:transition-none ${status?.status === "stopped" ? "opacity-55 grayscale" : ""}`}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(16,185,129,0.2),transparent_35%),linear-gradient(90deg,rgba(2,6,23,0.95)_0%,rgba(2,6,23,0.78)_43%,rgba(2,6,23,0.32)_75%,rgba(2,6,23,0.65)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(2,6,23,0.75)_0%,transparent_55%)]" />
        <div className="relative grid min-h-[25rem] gap-8 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-center lg:p-10">
          <div className="max-w-2xl space-y-6">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="w-fit px-0 text-slate-200 hover:bg-transparent hover:text-white"
            >
              <Link to="/gameserver">
                <ArrowLeft className="h-4 w-4" />
                Game Servers
              </Link>
            </Button>
            <div className="space-y-3">
              <Badge
                variant="outline"
                className="gap-2 border-emerald-300/30 bg-emerald-400/15 text-emerald-50"
              >
                <span
                  className={`h-2 w-2 rounded-full ${running ? "bg-emerald-300" : "bg-slate-300"}`}
                />
                {state.loadingStatus
                  ? "Checking host..."
                  : state.error
                    ? "Host unavailable"
                    : dragonwildsStatusLabel(status?.status)}
              </Badge>
              <div className="space-y-2">
                <h1
                  id="dragonwilds-title"
                  className="flex items-center gap-3 font-serif text-4xl font-bold sm:text-5xl"
                >
                  <Sprout className="h-10 w-10 text-emerald-300" />
                  Dragonwilds
                </h1>
                <p className="text-base text-slate-200">varrock n roll</p>
              </div>
              {status && !state.loadingStatus && (
                <p className="max-w-xl text-base text-slate-200">
                  {!enabled
                    ? status.disabledMessage ||
                      "Dragonwilds is disabled. Controls are unavailable."
                    : running
                      ? "Live."
                      : status.message}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="border-slate-200/45 bg-slate-300/10 text-slate-50 hover:bg-slate-300/20 hover:text-white"
                onClick={() => {
                  setStopOpen(false);
                  void refreshStatus();
                }}
                disabled={state.loadingStatus || Boolean(state.action)}
              >
                <RefreshCw className="h-4 w-4" />
                Refresh status
              </Button>
              <Button
                className="bg-emerald-500 text-white hover:bg-emerald-400"
                onClick={() => void runAction("start")}
                disabled={!canDragonwildsAct(state, "start")}
              >
                <Power className="h-4 w-4" />
                {state.action === "start" ? "Starting..." : "Start"}
              </Button>
              <Dialog open={stopOpen && canStop} onOpenChange={setStopOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" disabled={!canStop}>
                    <PowerOff className="h-4 w-4" />
                    {state.action === "stop" ? "Stopping..." : "Stop"}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg motion-reduce:animate-none">
                  <DialogHeader>
                    <DialogTitle>Stop Dragonwilds?</DialogTitle>
                    <DialogDescription>
                      Stopping the host disconnects anyone playing.{" "}
                      {state.loadingTelemetry
                        ? "Player count unavailable"
                        : onlineLabel(
                            state.telemetry?.playerCount,
                            state.telemetry?.maxPlayers,
                          )}
                      .
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex justify-end gap-2">
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button
                      variant="destructive"
                      disabled={!canStop}
                      onClick={() => {
                        setStopOpen(false);
                        void runAction("stop");
                      }}
                    >
                      Confirm stop
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-lg border border-white/15 bg-slate-950/35 p-4 backdrop-blur">
              <Users className="h-5 w-5 text-emerald-300" />
              <p className="mt-3 text-xs font-medium tracking-wider text-slate-300 uppercase">
                Players
              </p>
              <p className="mt-1 text-lg font-semibold">
                {state.loadingTelemetry
                  ? "Checking..."
                  : onlineLabel(
                      state.telemetry?.playerCount,
                      state.telemetry?.maxPlayers,
                    )}
              </p>
            </div>
            <div className="rounded-lg border border-white/15 bg-slate-950/35 p-4 backdrop-blur">
              <Server className="h-5 w-5 text-emerald-300" />
              <p className="mt-3 text-xs font-medium tracking-wider text-slate-300 uppercase">
                Host uptime
              </p>
              <p className="mt-1 text-lg font-semibold">
                {running && !state.error
                  ? uptimeLabel(status?.launchTime, status?.checkedAt)
                  : "Unavailable"}
              </p>
            </div>
            <div className="rounded-lg border border-white/15 bg-slate-950/35 p-4 backdrop-blur">
              <RefreshCw className="h-5 w-5 text-emerald-300" />
              <p className="mt-3 text-xs font-medium tracking-wider text-slate-300 uppercase">
                Last checked
              </p>
              <p className="mt-1 text-sm font-semibold">
                {checkedTime(status?.checkedAt)}
              </p>
            </div>
          </div>
        </div>
      </section>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state.notice && (
        <p role="status" className="text-sm">
          {state.notice}
        </p>
      )}
      {state.waitingForHost && (
        <p role="status" className="text-sm text-muted-foreground">
          Waiting for host startup. Checking every 10 seconds, up to 48
          attempts.
        </p>
      )}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Server details
            </CardTitle>
            <CardDescription>
              Host information updates with the latest status check.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <section aria-labelledby="dragonwilds-details" className="space-y-4">
              <h2
                id="dragonwilds-details"
                className="font-serif text-lg font-semibold"
              >
                AWS host
              </h2>
              <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 text-sm">
                <div className="rounded-md border p-3">
                  <dt className="text-xs text-muted-foreground">Region</dt>
                  <dd className="mt-1 font-medium">ap-southeast-2</dd>
                </div>
                <div className="rounded-md border p-3">
                  <dt className="text-xs text-muted-foreground">RAM</dt>
                  <dd className="mt-1 font-medium">
                    {state.loadingTelemetry || state.loadingStatus
                      ? "Checking..."
                      : running
                        ? memoryLabel(state.telemetry?.memoryUsedPercent)
                        : "Unavailable"}
                  </dd>
                </div>
                <div className="rounded-md border p-3">
                  <dt className="text-xs text-muted-foreground">
                    Instance type
                  </dt>
                  <dd className="mt-1 font-medium">
                    {status?.instanceType ?? "Unavailable"}
                  </dd>
                </div>
              </dl>
              {worldName && (
                <div className="space-y-2 border-t pt-4">
                  <p className="text-sm text-muted-foreground">World name</p>
                  <p className="break-words font-medium">{worldName}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void copyWorldName()}
                  >
                    <Copy className="h-4 w-4" />
                    Copy world name
                  </Button>
                </div>
              )}
              <p className="border-t pt-4 text-sm text-muted-foreground">
                Automatic idle shutdown inactive.
              </p>
            </section>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <div className="lg:sticky lg:top-4">
            <DragonwildsConnectionPanel
              address={connectionAddress}
              ready={Boolean(connectionAddress)}
              onCopyAddress={() => {
                if (connectionAddress)
                  void copyText(connectionAddress, "Address copied.");
              }}
              onCopyPassword={() =>
                void copyText(DRAGONWILDS_PASSWORD, "Password copied.")
              }
            />
          </div>
          <DragonwildsActivity
            state={state}
            onRefresh={() => void refreshEvents()}
          />
        </div>
      </div>
    </div>
  );
}

export function DragonwildsServerPage() {
  const auth = useGameServerAuth("dragonwilds");
  const server = useDragonwildsServer(auth);
  if (auth.checking)
    return (
      <p role="status" className="py-12 text-center text-muted-foreground">
        Checking Dragonwilds access...
      </p>
    );
  if (!auth.authed)
    return (
      <AuthAccessState
        title="Dragonwilds"
        description="Login with Discord to view game server access."
        error={auth.error}
        onLogin={auth.login}
      />
    );
  if (!auth.canUseGameServers || server.state.accessDenied)
    return (
      <AuthAccessState
        title="Dragonwilds access required"
        description="An active game-server grant or admin access is required. Contact a Free Company admin."
        showLogin={false}
      />
    );
  return <DragonwildsDashboard key={server.state.identity} server={server} />;
}
