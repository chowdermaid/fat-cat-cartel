import { useCallback, useMemo, useState } from "react";
import { Drama } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { storedSessionIsAdmin, storedSessionToken } from "@/features/admin/utils/adminAuthStorage";
import { triggerDmuProgressRefresh } from "../api/dmuProgressFetchers";
import { DMU_PAGE_TITLE, DMU_PLAYER_COLORS } from "../constants";
import { useDmuProgress } from "../hooks/useDmuProgress";
import type { PlayerWithColor } from "../types";
import { formatDateTime } from "../utils/formatting";
import { DmuRecentActivity } from "./activity/DmuRecentActivity";
import { DmuProgressChart } from "./chart/DmuProgressChart";

export function DmuProgPage() {
  const { data, loading, error, reload } = useDmuProgress();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [refreshingDmu, setRefreshingDmu] = useState(false);
  const adminSessionToken = useMemo(
    () => storedSessionIsAdmin() ? storedSessionToken() : null,
    [],
  );
  const players = useMemo<PlayerWithColor[]>(() => {
    const values = Object.values(data?.players ?? {});
    return values
      .sort((a, b) => a.bestProgress - b.bestProgress || b.pullCount - a.pullCount)
      .map((player, index) => ({
        ...player,
        color: DMU_PLAYER_COLORS[index % DMU_PLAYER_COLORS.length],
      }));
  }, [data?.players]);
  const playerMap = useMemo(
    () => Object.fromEntries(players.map((player) => [player.lodestoneId, player])),
    [players],
  );
  const refreshDmuProgress = useCallback(async () => {
    if (!adminSessionToken) return;
    const toastId = toast.loading("Refreshing DMU progress...");
    setRefreshingDmu(true);
    try {
      const result = await triggerDmuProgressRefresh(adminSessionToken);
      await reload();
      toast.success(
        `DMU refreshed for ${result.sourceStatus.playersWithProgress}/${result.sourceStatus.eligibleMembers} proggers.`,
        { id: toastId },
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "DMU refresh failed.", { id: toastId });
    } finally {
      setRefreshingDmu(false);
    }
  }, [adminSessionToken, reload]);

  if (loading) {
    return (
      <div className="min-w-0 max-w-full space-y-4 overflow-x-hidden">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[640px] w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-w-0 max-w-full overflow-x-hidden">
        <div className="rounded-lg border bg-muted/30 px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">{error ?? "DMU progress is not cached yet."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full space-y-4 overflow-x-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-serif text-3xl font-bold">
            <Drama className="h-7 w-7 text-muted-foreground" />
            {DMU_PAGE_TITLE}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Updated {formatDateTime(data.lastUpdated)}
          </p>
        </div>
        {data.sourceStatus.pageCapReached && (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
            Activity page cap reached during last refresh.
          </p>
        )}
      </div>

      {players.length === 0 ? (
        <div className="rounded-lg border bg-muted/30 px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">No FC members have cached DMU progress yet.</p>
        </div>
      ) : (
        <section className="min-w-0 max-w-full overflow-hidden">
          <DmuProgressChart
            data={data}
            players={players}
            selectedId={selectedId}
            hoveredId={hoveredId}
            selectorOpen={selectorOpen}
            onSelect={setSelectedId}
            onHover={setHoveredId}
            onSelectorOpen={setSelectorOpen}
            onClear={() => setSelectedId(null)}
            canRefresh={Boolean(adminSessionToken)}
            refreshing={refreshingDmu}
            onRefresh={refreshDmuProgress}
          />
        </section>
      )}

      <DmuRecentActivity activities={data.activities ?? []} players={playerMap} />
    </div>
  );
}
