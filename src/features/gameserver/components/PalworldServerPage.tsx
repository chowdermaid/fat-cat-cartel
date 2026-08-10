import { useCallback, useEffect, useRef, useState } from "react";
import {
  Power,
  Server,
} from "lucide-react";
import { toast } from "sonner";
import { AuthAccessState } from "@/components/auth/AuthAccessState";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  getGameServerStatus,
  getGameServerTelemetry,
  listGameServerEvents,
  startGameServer,
  stopGameServer,
} from "../api/gameServerFunctions";
import { useGameServerAuth } from "../hooks/useGameServerAuth";
import { usePalworldServerAnimations } from "../hooks/usePalworldServerAnimations";
import type {
  GameServerActionResponse,
  GameServerAuditLogEntry,
  GameServerStatusResponse,
} from "../types";
import { PalworldActivityTimeline } from "./palworld/PalworldActivityTimeline";
import { PalworldConnectionPanel } from "./palworld/PalworldConnectionPanel";
import { PalworldCostSummary } from "./palworld/PalworldCostSummary";
import { PalworldPlayerField } from "./palworld/PalworldPlayerField";
import { PalworldServerHero } from "./palworld/PalworldServerHero";
import { PalworldServerUsage } from "./palworld/PalworldServerUsage";
import { PalworldStartupStatus } from "./palworld/PalworldStartupStatus";

const START_POLL_INTERVAL_MS = 10_000;
const START_POLL_MAX_ATTEMPTS = 48;
const PALWORLD_PASSWORD = "chowiscool";

function PalworldServerLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-[25rem] w-full rounded-xl" />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
function formatDateTime(value: string | null | undefined): string {
  if (!value) return "Unavailable";
  return new Date(value).toLocaleString();
}

function formatPlayers(status: GameServerStatusResponse | null): string {
  if (!status || status.playerCount === null) return "Unavailable";
  if (status.maxPlayers === null) return `${status.playerCount}`;
  return `${status.playerCount}/${status.maxPlayers}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
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
    players: result.players ?? fallback?.players ?? [],
    memoryUsedPercent:
      result.memoryUsedPercent ?? fallback?.memoryUsedPercent ?? null,
    diskUsedPercent: result.diskUsedPercent ?? fallback?.diskUsedPercent ?? null,
    idleSince: result.idleSince ?? fallback?.idleSince ?? null,
    autoStopEligibleAt:
      result.autoStopEligibleAt ?? fallback?.autoStopEligibleAt ?? null,
    telemetryCheckedAt:
      result.telemetryCheckedAt ?? fallback?.telemetryCheckedAt ?? null,
    telemetryMessage: result.telemetryMessage ?? fallback?.telemetryMessage ?? null,
    monthlyCost: result.monthlyCost ?? fallback?.monthlyCost ?? null,
    previousMonthCost:
      result.previousMonthCost ?? fallback?.previousMonthCost ?? null,
  };
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
  const { rootRef, pulseCopy } = usePalworldServerAnimations(
    status?.status,
    actionLoading,
    status?.status === "running" && Boolean(status.connectAddress),
  );

  const loadEvents = useCallback(async () => {
    if (!auth.sessionToken) return;
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
  }, [auth.sessionToken]);

  const loadTelemetry = useCallback(async () => {
    if (!auth.sessionToken) return;
    try {
      const telemetry = await getGameServerTelemetry(
        auth.sessionToken,
        "palworld",
      );
      setStatus((current) =>
        current?.status === "running"
          ? {
              ...current,
              playerCount: telemetry.playerCount,
              maxPlayers: telemetry.maxPlayers,
              players: telemetry.players,
              memoryUsedPercent: telemetry.memoryUsedPercent,
              diskUsedPercent: telemetry.diskUsedPercent,
              telemetryCheckedAt: telemetry.telemetryCheckedAt,
              telemetryMessage: telemetry.telemetryMessage,
            }
          : current,
      );
    } catch {
      // Basic EC2 status remains usable when optional telemetry is unavailable.
    }
  }, [auth.sessionToken]);

  const refreshStatus = useCallback(async (options?: { quiet?: boolean }) => {
    if (!auth.sessionToken) return null;
    if (!options?.quiet) setLoadingStatus(true);
    try {
      const result = await getGameServerStatus(auth.sessionToken, "palworld");
      setStatus(result);
      setAccessDenied(false);
      if (result.status === "running") void loadTelemetry();
      return result;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to refresh Palworld.";
      if (message.toLowerCase().includes("whitelist")) {
        setAccessDenied(true);
        return null;
      }
      if (!options?.quiet) toast.error(message);
      return null;
    } finally {
      if (!options?.quiet) setLoadingStatus(false);
    }
  }, [auth.sessionToken, loadTelemetry]);

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
    if (!auth.sessionToken) return;
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

  async function copyText(value: string, successMessage: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(successMessage);
      return true;
    } catch {
      toast.error("Could not copy.");
      return false;
    }
  }

  useEffect(() => {
    if (!auth.authed || !auth.sessionToken) return;
    void refreshStatus();
    void loadEvents();
    return () => {
      pollCancelledRef.current = true;
    };
  }, [auth.authed, auth.sessionToken, loadEvents, refreshStatus]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const canCopy = status?.status === "running" && Boolean(status.connectAddress);
  if (auth.checking) {
    return <PalworldServerLoading />;
  }

  if (!auth.authed) {
    return (
      <AuthAccessState
        title="Palworld Server"
        description="Login with Discord to view Palworld access."
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
        description="Your Discord account does not currently have Palworld access."
        error="Game server whitelist required."
        showLogin={false}
      />
    );
  }

  if (!status && loadingStatus) {
    return <PalworldServerLoading />;
  }

  return (
    <div ref={rootRef} className="space-y-6">
      <PalworldServerHero
        status={status}
        statusLabel={friendlyStatus(status)}
        playersLabel={formatPlayers(status)}
        loadingStatus={loadingStatus}
        actionLoading={actionLoading}
        onRefresh={() => void refreshStatus()}
        onStart={() => void runAction("start")}
        onStop={() => setStopConfirmOpen(true)}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Server Status</CardTitle>
            <CardDescription>
              Start waits until the connect address is ready.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <PalworldServerUsage status={status} now={now} />

            {status?.telemetryMessage && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-200">
                {status.telemetryMessage}
              </div>
            )}

            {(actionLoading === "start" || status?.status === "pending") && (
              <PalworldStartupStatus
                status={status}
                starting={actionLoading === "start"}
              />
            )}

            {status?.status === "running" && (
              <PalworldPlayerField players={status.players} />
            )}

            <PalworldCostSummary status={status} now={now} />

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
              </div>
            </section>

          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="lg:sticky lg:top-4">
            <PalworldConnectionPanel
              address={status?.connectAddress}
              password={PALWORLD_PASSWORD}
              ready={canCopy}
              onCopyAddress={() => {
                if (!status?.connectAddress) return;
                void copyText(
                  status.connectAddress,
                  "Connect address copied.",
                ).then((copied) => copied && pulseCopy("address"));
              }}
              onCopyPassword={() => {
                void copyText(PALWORLD_PASSWORD, "Password copied.").then(
                  (copied) => copied && pulseCopy("password"),
                );
              }}
            />
          </div>

          <PalworldActivityTimeline
            entries={events}
            loading={loadingEvents}
            onRefresh={() => void loadEvents()}
          />
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
