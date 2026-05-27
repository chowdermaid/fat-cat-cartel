import { useEffect, useState } from "react";
import { AlertTriangle, CalendarDays, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db, onValue, ref } from "@/lib/db";
import { firebaseApp } from "@/lib/firebase";
import { callAdminFunction } from "../lib/adminFunctions";

type CalendarSyncStatusProps = {
  adminSessionToken: string | null;
};

type ParseFailure = {
  messageId?: unknown;
  reason?: unknown;
  sampledAt?: unknown;
};

type SyncStatus = {
  lastStartedAt: number | null;
  lastSucceededAt: number | null;
  lastFailedAt: number | null;
  importedCount: number;
  skippedCount: number;
  lastError: string | null;
  recentFailures: ParseFailure[];
};

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

function parseStatus(value: unknown): SyncStatus {
  const raw = typeof value === "object" && value ? value as Record<string, unknown> : {};
  return {
    lastStartedAt: typeof raw.lastStartedAt === "number" ? raw.lastStartedAt : null,
    lastSucceededAt: typeof raw.lastSucceededAt === "number" ? raw.lastSucceededAt : null,
    lastFailedAt: typeof raw.lastFailedAt === "number" ? raw.lastFailedAt : null,
    importedCount: typeof raw.importedCount === "number" ? raw.importedCount : 0,
    skippedCount: typeof raw.skippedCount === "number" ? raw.skippedCount : 0,
    lastError: typeof raw.lastError === "string" && raw.lastError.trim()
      ? raw.lastError.trim()
      : null,
    recentFailures: Array.isArray(raw.recentFailures) ? raw.recentFailures.slice(0, 5) : [],
  };
}

function formatTime(value: number | null): string {
  return value ? DATE_TIME_FORMATTER.format(new Date(value)) : "Never";
}

export function CalendarSyncStatus({ adminSessionToken }: CalendarSyncStatusProps) {
  const [status, setStatus] = useState<SyncStatus>(() => parseStatus(null));
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    return onValue(ref(db, "calendarSync/discordPlanner"), (snap: { val(): unknown }) => {
      setStatus(parseStatus(snap.val()));
    });
  }, []);

  async function refreshNow() {
    if (!firebaseApp || !adminSessionToken) {
      toast.error("Firebase Functions are required for Raid Helper sync.");
      return;
    }

    setRefreshing(true);
    const id = "discord-planner-sync";
    toast.loading("Syncing Raid Helper events...", { id });
    try {
      const result = await callAdminFunction<{
        importedCount: number;
        skippedCount: number;
      }>("triggerDiscordPlannerSync", adminSessionToken, {}, { timeout: 60_000 });
      toast.success(
        `Imported ${result.importedCount} event${result.importedCount === 1 ? "" : "s"}. Skipped ${result.skippedCount}.`,
        { id },
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Raid Helper sync failed.", { id });
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-lg font-serif">Calendar Sync</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Raid Helper import status.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshNow}
            disabled={refreshing}
          >
            <RefreshCw className={refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Sync now
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-md border bg-background/60 p-3">
            <p className="text-xs text-muted-foreground">Last success</p>
            <p className="mt-1 font-medium">{formatTime(status.lastSucceededAt)}</p>
          </div>
          <div className="rounded-md border bg-background/60 p-3">
            <p className="text-xs text-muted-foreground">Imported</p>
            <p className="mt-1 font-medium">{status.importedCount}</p>
          </div>
          <div className="rounded-md border bg-background/60 p-3">
            <p className="text-xs text-muted-foreground">Skipped</p>
            <p className="mt-1 font-medium">{status.skippedCount}</p>
          </div>
        </div>

        {status.lastError && (
          <div className="flex gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{status.lastError}</span>
          </div>
        )}

        {status.recentFailures.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Parse issues</Badge>
              <span className="text-xs text-muted-foreground">
                Recent events skipped
              </span>
            </div>
            <div className="divide-y rounded-md border">
              {status.recentFailures.map((failure, index) => (
                <div key={`${String(failure.messageId ?? "unknown")}-${index}`} className="px-3 py-2 text-xs">
                  <p className="font-medium">
                    Event {String(failure.messageId ?? "unknown")}
                  </p>
                  <p className="mt-0.5 text-muted-foreground">
                    {String(failure.reason ?? "Unknown parse issue.")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
