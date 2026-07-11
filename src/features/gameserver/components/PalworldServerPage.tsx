import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowLeft,
  Clock3,
  Copy,
  Globe2,
  HardDrive,
  MemoryStick,
  Power,
  RefreshCw,
  Server,
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
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getGameServerStatus,
  listGameServerEvents,
  startGameServer,
  stopGameServer,
} from "../api/gameServerFunctions";
import { useGameServerAuth } from "../hooks/useGameServerAuth";
import type {
  GameServerActionResponse,
  GameServerAuditLogEntry,
  GameServerStatus,
  GameServerStatusResponse,
} from "../types";

const START_POLL_INTERVAL_MS = 10_000;
const START_POLL_MAX_ATTEMPTS = 48;
const PALWORLD_PASSWORD = "chowiscool";
const PALWORLD_RAM_GB = 8;
const PALWORLD_DISK_GB = 30;
const INSTANCE_PRICES_AUD: Record<string, number> = {
  "t3a.large": 0.15,
  "t3a.xlarge": 0.3,
};

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "Unavailable";
  return new Date(value).toLocaleString();
}

function formatTimestamp(value: number | null | undefined): string {
  if (!value) return "Never";
  return new Date(value).toLocaleString();
}

function formatPercent(value: number | null | undefined): string {
  return typeof value === "number" ? `${value.toFixed(1)}%` : "Unavailable";
}

function formatUsedAmount(
  percent: number | null | undefined,
  capacity: number,
): string {
  if (typeof percent !== "number") return `Unavailable of ${capacity} GB`;
  return `${((percent / 100) * capacity).toFixed(1)} of ${capacity} GB`;
}

function formatPlayers(status: GameServerStatusResponse | null): string {
  if (!status || status.playerCount === null) return "Unavailable";
  if (status.maxPlayers === null) return `${status.playerCount}`;
  return `${status.playerCount}/${status.maxPlayers}`;
}

function formatDuration(ms: number): string {
  if (ms <= 0) return "0m";
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function sessionCostAud(
  status: GameServerStatusResponse | null,
  now: number,
): { runningFor: string; cost: string; hourlyRate: string } {
  const hourlyRate = status?.instanceType
    ? INSTANCE_PRICES_AUD[status.instanceType]
    : undefined;
  if (
    status?.status !== "running" ||
    !status.launchTime ||
    typeof hourlyRate !== "number"
  ) {
    return {
      runningFor: "Not running",
      cost: "Unavailable",
      hourlyRate:
        typeof hourlyRate === "number"
          ? `A$${hourlyRate.toFixed(2)}/hr`
          : "Unknown rate",
    };
  }
  const launchedAt = new Date(status.launchTime).getTime();
  const elapsedMs = Math.max(0, now - launchedAt);
  const hoursRunning = elapsedMs / 1000 / 60 / 60;
  return {
    runningFor: formatDuration(elapsedMs),
    cost: `~A$${(hoursRunning * hourlyRate).toFixed(2)}`,
    hourlyRate: `A$${hourlyRate.toFixed(2)}/hr`,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function stateTone(status: GameServerStatus | undefined): string {
  if (status === "running") return "text-emerald-600";
  if (status === "stopped" || status === "disabled") {
    return "text-muted-foreground";
  }
  if (status === "pending" || status === "stopping") return "text-amber-600";
  if (status === "terminated" || status === "unavailable") {
    return "text-destructive";
  }
  return "";
}

function friendlyStatus(status: GameServerStatusResponse | null): string {
  if (!status) return "Unknown";
  if (!status.enabled || status.status === "disabled") return "Disabled";
  if (status.status === "running") return "Ready to join";
  if (status.status === "pending") return "Starting";
  if (status.status === "stopping") return "Stopping";
  if (status.status === "stopped") return "Offline";
  if (status.status === "terminated" || status.status === "unavailable") {
    return "Needs admin attention";
  }
  return "Unknown";
}

function actionToStatus(
  result: GameServerActionResponse,
  fallback: GameServerStatusResponse | null,
): GameServerStatusResponse {
  return {
    ok: true,
    serverId: result.serverId,
    status: result.status,
    checkedAt: result.checkedAt ?? Date.now(),
    host: result.host ?? fallback?.host ?? null,
    connectAddress: result.connectAddress ?? fallback?.connectAddress ?? null,
    message: result.message,
    enabled: result.enabled ?? fallback?.enabled ?? true,
    disabledMessage: result.disabledMessage ?? fallback?.disabledMessage ?? null,
    instanceId: result.instanceId ?? fallback?.instanceId ?? null,
    instanceType: result.instanceType ?? fallback?.instanceType ?? null,
    launchTime: result.launchTime ?? fallback?.launchTime ?? null,
    playerCount: result.playerCount ?? fallback?.playerCount ?? null,
    maxPlayers: result.maxPlayers ?? fallback?.maxPlayers ?? null,
    memoryUsedPercent:
      result.memoryUsedPercent ?? fallback?.memoryUsedPercent ?? null,
    diskUsedPercent: result.diskUsedPercent ?? fallback?.diskUsedPercent ?? null,
    idleSince: result.idleSince ?? fallback?.idleSince ?? null,
    autoStopEligibleAt:
      result.autoStopEligibleAt ?? fallback?.autoStopEligibleAt ?? null,
    telemetryCheckedAt:
      result.telemetryCheckedAt ?? fallback?.telemetryCheckedAt ?? null,
    telemetryMessage: result.telemetryMessage ?? fallback?.telemetryMessage ?? null,
  };
}

function auditActor(entry: GameServerAuditLogEntry): string {
  return entry.requestedByDisplayName || entry.requestedByDiscordUserId || "Unknown";
}

function UsageBar({
  label,
  icon: Icon,
  percent,
  capacity,
}: {
  label: string;
  icon: typeof MemoryStick;
  percent: number | null | undefined;
  capacity: number;
}) {
  const width = Math.min(100, Math.max(0, percent ?? 0));
  return (
    <div className="rounded-md border px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </div>
        <div className="text-xs font-medium">{formatPercent(percent)}</div>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-emerald-500"
          style={{ width: `${width}%` }}
        />
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        {formatUsedAmount(percent, capacity)}
      </div>
    </div>
  );
}

export function PalworldServerPage() {
  const auth = useGameServerAuth();
  const [status, setStatus] = useState<GameServerStatusResponse | null>(null);
  const [events, setEvents] = useState<GameServerAuditLogEntry[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [actionLoading, setActionLoading] = useState<"start" | "stop" | null>(
    null,
  );
  const [accessDenied, setAccessDenied] = useState(false);
  const [stopConfirmOpen, setStopConfirmOpen] = useState(false);
  const pollCancelledRef = useRef(false);

  async function loadEvents() {
    if (!auth.sessionToken || !auth.canUseGameServers) return;
    setLoadingEvents(true);
    try {
      const result = await listGameServerEvents(auth.sessionToken, "palworld");
      setEvents(result.entries);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load Palworld events.",
      );
    } finally {
      setLoadingEvents(false);
    }
  }

  async function refreshStatus(options?: { quiet?: boolean }) {
    if (!auth.sessionToken || !auth.canUseGameServers) return null;
    if (!options?.quiet) setLoadingStatus(true);
    try {
      const result = await getGameServerStatus(auth.sessionToken, "palworld");
      setStatus(result);
      setAccessDenied(false);
      return result;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to refresh Palworld.";
      if (
        message.toLowerCase().includes("boss") ||
        message.toLowerCase().includes("underpaw")
      ) {
        setAccessDenied(true);
        return null;
      }
      if (!options?.quiet) toast.error(message);
      return null;
    } finally {
      if (!options?.quiet) setLoadingStatus(false);
    }
  }

  async function pollUntilReady() {
    for (let attempt = 0; attempt < START_POLL_MAX_ATTEMPTS; attempt += 1) {
      await sleep(START_POLL_INTERVAL_MS);
      if (pollCancelledRef.current) return;
      const result = await refreshStatus({ quiet: true });
      if (!result) continue;
      if (result.status === "running" && result.connectAddress) {
        toast.success("Palworld is ready to join.");
        void loadEvents();
        return;
      }
      if (result.status === "disabled" || result.status === "stopped") {
        toast.error(result.message || "Palworld did not finish starting.");
        return;
      }
    }
    toast.error("Palworld is still starting. Refresh again in a bit.");
  }

  async function runAction(action: "start" | "stop") {
    if (!auth.sessionToken || !auth.canUseGameServers) return;
    setActionLoading(action);
    pollCancelledRef.current = action !== "start";
    try {
      const result =
        action === "start"
          ? await startGameServer(auth.sessionToken, "palworld")
          : await stopGameServer(auth.sessionToken, "palworld");
      setStatus((current) => actionToStatus(result, current));
      toast.success(result.message);
      void loadEvents();
      if (action === "start") {
        pollCancelledRef.current = false;
        await pollUntilReady();
      } else {
        await refreshStatus({ quiet: true });
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : `Failed to ${action} Palworld.`,
      );
    } finally {
      setActionLoading(null);
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

  useEffect(() => {
    if (!auth.authed || !auth.sessionToken || !auth.canUseGameServers) return;
    void refreshStatus();
    void loadEvents();
    return () => {
      pollCancelledRef.current = true;
    };
  }, [auth.authed, auth.canUseGameServers, auth.sessionToken]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const controlsDisabled = actionLoading !== null || status?.enabled === false;
  const canCopy = status?.status === "running" && Boolean(status.connectAddress);
  const autoStopText =
    status?.autoStopEligibleAt && status.status === "running"
      ? formatTimestamp(status.autoStopEligibleAt)
      : "Not counting down";
  const currentSessionCost = sessionCostAud(status, now);

  if (!auth.authed) {
    return (
      <AuthAccessState
        title="Palworld Server"
        description="Login with your linked member account to view Palworld access."
        error={auth.error}
        checking={auth.checking}
        onLogin={auth.login}
      />
    );
  }

  if (accessDenied) {
    return (
      <AuthAccessState
        title="Palworld Server"
        description="This page is limited to Boss and Underpaw admins."
        error="Boss or Underpaw Discord role required."
        showLogin={false}
      />
    );
  }

  if (!auth.canUseGameServers) {
    return (
      <AuthAccessState
        title="Palworld Server"
        description="This page is limited to Boss and Underpaw admins."
        error="Boss or Underpaw Discord role required."
        showLogin={false}
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <Button asChild variant="ghost" size="sm" className="w-fit px-0">
            <Link to="/gameserver">
              <ArrowLeft className="h-4 w-4" />
              Game Servers
            </Link>
          </Button>
          <div className="space-y-1">
            <h1 className="flex items-center gap-2 text-3xl font-bold font-serif">
              <Server className="h-7 w-7 text-muted-foreground" />
              Palworld Server
            </h1>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Server Status</CardTitle>
            <CardDescription>
              Start waits until the connect address is ready.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Users className="h-4 w-4 text-muted-foreground" />
                Server
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-md border px-3 py-3">
                  <div className="text-xs text-muted-foreground">State</div>
                  <div className={`mt-1 text-lg font-semibold ${stateTone(status?.status)}`}>
                    {friendlyStatus(status)}
                  </div>
                </div>
                <div className="rounded-md border px-3 py-3">
                  <div className="text-xs text-muted-foreground">Players</div>
                  <div className="mt-1 text-lg font-semibold">
                    {formatPlayers(status)}
                  </div>
                </div>
                <UsageBar
                  label="RAM"
                  icon={MemoryStick}
                  percent={status?.memoryUsedPercent}
                  capacity={PALWORLD_RAM_GB}
                />
                <UsageBar
                  label="Disk"
                  icon={HardDrive}
                  percent={status?.diskUsedPercent}
                  capacity={PALWORLD_DISK_GB}
                />
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Clock3 className="h-4 w-4 text-muted-foreground" />
                Current Session
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-md border px-3 py-3">
                  <div className="text-xs text-muted-foreground">Running for</div>
                  <div className="mt-1 text-lg font-semibold">
                    {currentSessionCost.runningFor}
                  </div>
                </div>
                <div className="rounded-md border px-3 py-3">
                  <div className="text-xs text-muted-foreground">Compute cost</div>
                  <div className="mt-1 text-lg font-semibold">
                    {currentSessionCost.cost}
                  </div>
                </div>
                <div className="rounded-md border px-3 py-3">
                  <div className="text-xs text-muted-foreground">Hourly rate</div>
                  <div className="mt-1 text-lg font-semibold">
                    {currentSessionCost.hourlyRate}
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Server className="h-4 w-4 text-muted-foreground" />
                AWS
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-md border px-3 py-3">
                  <div className="text-xs text-muted-foreground">Region</div>
                  <div className="mt-1 text-sm font-medium">ap-southeast-2</div>
                </div>
                <div className="rounded-md border px-3 py-3">
                  <div className="text-xs text-muted-foreground">Host</div>
                  <div className="mt-1 break-all text-sm font-medium">
                    {status?.status === "running" && status.host
                      ? status.host
                      : "Unavailable"}
                  </div>
                </div>
                <div className="rounded-md border px-3 py-3">
                  <div className="text-xs text-muted-foreground">Instance Type</div>
                  <div className="mt-1 text-sm font-medium">
                    {status?.instanceType ?? "Unavailable"}
                  </div>
                </div>
                <div className="rounded-md border px-3 py-3">
                  <div className="text-xs text-muted-foreground">Launched</div>
                  <div className="mt-1 text-sm font-medium">
                    {formatDateTime(status?.launchTime)}
                  </div>
                </div>
                <div className="rounded-md border px-3 py-3">
                  <div className="text-xs text-muted-foreground">Last checked</div>
                  <div className="mt-1 text-sm font-medium">
                    {status?.checkedAt
                      ? new Date(status.checkedAt).toLocaleTimeString()
                      : "Not yet"}
                  </div>
                </div>
                <div className="rounded-md border px-3 py-3">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5" />
                    Auto-stop at
                  </div>
                  <div className="mt-1 text-sm font-medium">{autoStopText}</div>
                </div>
              </div>
            </section>

            <div className="flex flex-wrap gap-2">
              <Button
                disabled={loadingStatus}
                onClick={() => void refreshStatus()}
              >
                <RefreshCw className="h-4 w-4" />
                {loadingStatus ? "Refreshing" : "Refresh"}
              </Button>
              <Button
                disabled={controlsDisabled || status?.status !== "stopped"}
                onClick={() => void runAction("start")}
              >
                <Power className="h-4 w-4" />
                {actionLoading === "start" ? "Starting" : "Start"}
              </Button>
              <Button
                disabled={controlsDisabled || status?.status !== "running"}
                variant="outline"
                onClick={() => setStopConfirmOpen(true)}
              >
                <Power className="h-4 w-4" />
                {actionLoading === "stop" ? "Stopping" : "Stop"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe2 className="h-4 w-4 text-muted-foreground" />
                Connect
              </CardTitle>
              <CardDescription>
                Copy these when Palworld is ready.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="rounded-md border px-3 py-2">
                <div className="text-xs text-muted-foreground">Address</div>
                <div className="mt-1 break-all font-medium">
                  {status?.connectAddress ?? "Start the server to show address."}
                </div>
              </div>
              <Button
                className="w-full"
                variant="outline"
                onClick={() =>
                  status?.connectAddress &&
                  void copyText(status.connectAddress, "Connect address copied.")
                }
                disabled={!canCopy}
              >
                <Copy className="h-4 w-4" />
                Copy Address
              </Button>
              <div className="rounded-md border px-3 py-2">
                <div className="text-xs text-muted-foreground">Password</div>
                <div className="mt-1 font-medium">{PALWORLD_PASSWORD}</div>
              </div>
              <Button
                className="w-full"
                variant="outline"
                onClick={() =>
                  void copyText(PALWORLD_PASSWORD, "Password copied.")
                }
              >
                <Copy className="h-4 w-4" />
                Copy Password
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-muted-foreground" />
                Latest Events
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void loadEvents()}
                disabled={loadingEvents}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {events.map((entry) => (
                <div key={entry.id} className="rounded-md border px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium capitalize">{entry.action}</span>
                    <Badge
                      variant={
                        entry.result === "failed" || entry.result === "blocked"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {entry.result}
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {auditActor(entry)} - {formatTimestamp(entry.createdAt)}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {entry.message}
                  </div>
                </div>
              ))}
              {!events.length && (
                <div className="rounded-md border border-dashed px-3 py-6 text-center text-muted-foreground">
                  {loadingEvents ? "Loading events..." : "No recent events."}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={stopConfirmOpen} onOpenChange={setStopConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stop Palworld?</DialogTitle>
            <DialogDescription>
              This will stop the EC2 instance and disconnect players. Current
              players: {formatPlayers(status)}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setStopConfirmOpen(false)}
              disabled={actionLoading === "stop"}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setStopConfirmOpen(false);
                void runAction("stop");
              }}
              disabled={actionLoading === "stop"}
            >
              <Power className="h-4 w-4" />
              {actionLoading === "stop" ? "Stopping" : "Stop Server"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
