import { useEffect, useRef } from "react";
import {
  CircleAlert,
  Clock3,
  Power,
  PowerOff,
  RefreshCw,
  Settings,
  TimerOff,
} from "lucide-react";
import { animate, createScope, stagger } from "animejs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type {
  GameServerAuditAction,
  GameServerAuditLogEntry,
  GameServerAuditResult,
} from "../../types";

type PalworldActivityTimelineProps = {
  entries: GameServerAuditLogEntry[];
  loading: boolean;
  onRefresh: () => void;
};

const ACTION_DETAILS: Record<
  GameServerAuditAction,
  { label: string; icon: typeof Power }
> = {
  start: { label: "Server start", icon: Power },
  stop: { label: "Server stop", icon: PowerOff },
  "auto-stop": { label: "Automatic stop", icon: TimerOff },
  settings: { label: "Settings updated", icon: Settings },
};

const RESULT_LABELS: Record<GameServerAuditResult, string> = {
  requested: "Requested",
  noop: "No change",
  blocked: "Blocked",
  failed: "Failed",
};

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function actorName(entry: GameServerAuditLogEntry): string {
  return (
    entry.requestedByDisplayName ||
    entry.requestedByDiscordUserId ||
    "Unknown"
  );
}

function formatTime(value: number): string {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function resultTone(result: GameServerAuditResult): {
  badge: "destructive" | "outline" | "secondary";
  line: string;
  node: string;
} {
  if (result === "failed" || result === "blocked") {
    return {
      badge: "destructive",
      line: "bg-destructive/30",
      node: "border-destructive/40 bg-destructive/10 text-destructive",
    };
  }
  if (result === "noop") {
    return {
      badge: "outline",
      line: "bg-border",
      node: "border-border bg-muted text-muted-foreground",
    };
  }
  return {
    badge: "secondary",
    line: "bg-emerald-500/30",
    node:
      "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  };
}

export function PalworldActivityTimeline({
  entries,
  loading,
  onRefresh,
}: PalworldActivityTimelineProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const previousIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const newEntryIds = new Set(
      entries
        .filter((entry) => !previousIdsRef.current.has(entry.id))
        .map((entry) => entry.id),
    );
    previousIdsRef.current = new Set(entries.map((entry) => entry.id));
    if (
      !rootRef.current ||
      newEntryIds.size === 0 ||
      prefersReducedMotion()
    ) {
      return;
    }

    const scope = createScope({ root: rootRef }).add(() => {
      const newElements = Array.from(
        rootRef.current?.querySelectorAll<HTMLElement>(
          "[data-timeline-entry]",
        ) ?? [],
      ).filter((element) =>
        newEntryIds.has(element.dataset.timelineEntry ?? ""),
      );
      animate(newElements, {
        opacity: [0, 1],
        translateY: [-8, 0],
        delay: stagger(65),
        duration: 360,
        ease: "out(4)",
      });
    });

    return () => scope.revert();
  }, [entries]);

  return (
    <Card ref={rootRef}>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock3 className="h-4 w-4 text-muted-foreground" />
            Recent activity
          </CardTitle>
          <CardDescription>Server actions and settings changes.</CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          disabled={loading}
          aria-label={loading ? "Refreshing activity" : "Refresh activity"}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent aria-live="polite">
        {entries.length > 0 ? (
          <ScrollArea className={entries.length > 4 ? "h-[25rem]" : ""}>
            <ol className="space-y-0 pr-3">
              {entries.map((entry, index) => {
                const action = ACTION_DETAILS[entry.action];
                const ActionIcon = action.icon;
                const tone = resultTone(entry.result);
                const hasStateChange =
                  entry.statusAfter && entry.statusAfter !== entry.statusBefore;

                return (
                  <li
                    key={entry.id}
                    data-timeline-entry={entry.id}
                    className="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-3 pb-5 last:pb-0"
                  >
                    {index < entries.length - 1 && (
                      <span
                        className={`absolute left-[0.9375rem] top-8 h-[calc(100%-1.5rem)] w-px ${tone.line}`}
                        aria-hidden="true"
                      />
                    )}
                    <span
                      className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border ${tone.node}`}
                      aria-hidden="true"
                    >
                      {entry.result === "failed" ||
                      entry.result === "blocked" ? (
                        <CircleAlert className="h-4 w-4" />
                      ) : (
                        <ActionIcon className="h-4 w-4" />
                      )}
                    </span>

                    <div className="min-w-0 pt-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{action.label}</span>
                        <Badge variant={tone.badge} className="text-[0.65rem]">
                          {RESULT_LABELS[entry.result]}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {actorName(entry)}
                        <span aria-hidden="true"> · </span>
                        <time dateTime={new Date(entry.createdAt).toISOString()}>
                          {formatTime(entry.createdAt)}
                        </time>
                      </p>
                      {hasStateChange && (
                        <p className="mt-1 text-xs font-medium capitalize">
                          {entry.statusBefore} to {entry.statusAfter}
                        </p>
                      )}
                      {entry.message && (
                        <p className="mt-1 break-words text-xs text-muted-foreground">
                          {entry.message}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </ScrollArea>
        ) : (
          <div className="rounded-md border border-dashed px-3 py-7 text-center text-sm text-muted-foreground">
            {loading ? "Loading activity..." : "No recent activity."}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
