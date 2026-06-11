import { useEffect, useState } from "react";
import { toast } from "sonner";
import { db, onValue, ref } from "@/lib/db";
import { firebaseApp } from "@/lib/firebase";
import { callAdminFunction } from "../api/adminFunctions";
import type { CalendarSyncStatusState } from "../types";

function parseStatus(value: unknown): CalendarSyncStatusState {
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

export function useCalendarSyncStatus(adminSessionToken: string | null) {
  const [status, setStatus] = useState<CalendarSyncStatusState>(() => parseStatus(null));
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

  return {
    status,
    refreshing,
    refreshNow,
  };
}
