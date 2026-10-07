import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminAuth } from "@/features/admin/hooks/useAdminAuth";
import dragonIcon from "@/assets/icons/dragon.svg";
import { triggerUcobProgressRefresh } from "../api/ucobProgressFetchers";
import { UCOB_PAGE_TITLE, UCOB_STATIC_NAME } from "../constants";
import { useUcobProgress } from "../hooks/useUcobProgress";
import { useUcobEntrance } from "../hooks/useUcobAnimations";
import { formatDateTime } from "../utils/formatting";
import { UcobRecentActivity } from "./activity/UcobRecentActivity";
import { UcobProgressChart } from "./chart/UcobProgressChart";
import { UcobPhaseProgress } from "./progress/UcobPhaseProgress";

export function UcobProgPage() {
  const headerRef = useUcobEntrance<HTMLElement>();
  const { data, loading, error, reload } = useUcobProgress();
  const auth = useAdminAuth();
  const [refreshing, setRefreshing] = useState(false);
  const canRefresh =
    auth.authed &&
    auth.session?.isMember === true &&
    Boolean(auth.session.lodestoneId) &&
    Boolean(auth.sessionToken);

  async function refreshProgress() {
    if (!canRefresh || !auth.sessionToken || refreshing) return;
    setRefreshing(true);
    const toastId = toast.loading(
      "Refreshing The Coils Cartel's UCOB progress...",
    );
    try {
      await triggerUcobProgressRefresh(auth.sessionToken);
      await reload();
      toast.success("UCOB progress refreshed.", { id: toastId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "UCOB refresh failed.", {
        id: toastId,
      });
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="min-w-0 max-w-full space-y-4 overflow-x-hidden">
      <header ref={headerRef} className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src={dragonIcon}
            alt=""
            className="h-14 w-14 shrink-0 object-contain dark:invert"
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-primary">
              {data?.static.name ?? UCOB_STATIC_NAME}
            </p>
            <h1 className="font-serif text-2xl font-bold sm:text-3xl">
              {UCOB_PAGE_TITLE}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {data
                ? `Updated ${formatDateTime(data.lastUpdated)}`
                : "Static progression"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={loading || refreshing}
            onClick={() => {
              void reload().catch(() =>
                toast.error("Failed to reload UCOB progress."),
              );
            }}
          >
            <RefreshCw className={`h-4 w-4 motion-reduce:animate-none ${loading ? "animate-spin" : ""}`} />
            Reload
          </Button>
          {canRefresh && (
            <Button
              size="sm"
              disabled={refreshing || loading}
              onClick={() => {
                void refreshProgress();
              }}
            >
              <RefreshCw
                className={`h-4 w-4 motion-reduce:animate-none ${refreshing ? "animate-spin" : ""}`}
              />
              {refreshing ? "Refreshing" : "Refresh progress"}
            </Button>
          )}
        </div>
      </header>
      <UcobPhaseProgress data={data} loading={loading && !data} />
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm"
        >
          {error}
        </p>
      )}
      {loading && !data ? (
        <Skeleton className="h-[500px] w-full motion-reduce:animate-none" />
      ) : !data || !data.points?.length ? (
        <div className="rounded-lg border bg-muted/30 px-6 py-12 text-center">
          <p className="font-medium">The Coils Cartel's journey starts here.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {data
              ? "No UCOB pulls have been recorded yet."
              : "UCOB progress hasn't been fetched yet."}
            {canRefresh
              ? " Use Refresh progress to fetch the latest Tomestone history."
              : "Sign in with your linked Discord account to refresh progress."}
          </p>
        </div>
      ) : (
        <UcobProgressChart data={data} />
      )}
      {data && <UcobRecentActivity activities={data.activities ?? []} />}
    </div>
  );
}
