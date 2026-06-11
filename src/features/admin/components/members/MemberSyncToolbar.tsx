import {
  Activity,
  ArrowDownUp,
  Database,
  IdCard,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatTimeAgo } from "../../utils/formatting";

type MemberSyncToolbarProps = {
  collectionLastFetched: number | null;
  raidLastUpdated: number | null;
  fetchingCollection: boolean;
  fetchingTomestone: boolean;
  fetchingFFLogs: boolean;
  fetchingLodestone: boolean;
  onRefreshCollection: () => void;
  onRefreshTomestone: () => void;
  onRefreshFFLogs: () => void;
  onImportLodestone: () => void;
};

export function MemberSyncToolbar({
  collectionLastFetched,
  raidLastUpdated,
  fetchingCollection,
  fetchingTomestone,
  fetchingFFLogs,
  fetchingLodestone,
  onRefreshCollection,
  onRefreshTomestone,
  onRefreshFFLogs,
  onImportLodestone,
}: MemberSyncToolbarProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <Database className="h-3.5 w-3.5 text-muted-foreground" />
            Collection
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {collectionLastFetched
              ? formatTimeAgo(collectionLastFetched)
              : "Never fetched"}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onRefreshCollection}
          disabled={fetchingCollection}
          className="shrink-0"
        >
          <RefreshCw
            className={cn("h-4 w-4", fetchingCollection && "animate-spin")}
          />
          {fetchingCollection ? "Fetching" : "Refresh"}
        </Button>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <ArrowDownUp className="h-3.5 w-3.5 text-muted-foreground" />
            Tomestone
          </p>
          <p className="truncate text-xs text-muted-foreground">
            Activity and profiles
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onRefreshTomestone}
          disabled={fetchingTomestone}
          className="shrink-0"
        >
          <RefreshCw
            className={cn("h-4 w-4", fetchingTomestone && "animate-spin")}
          />
          {fetchingTomestone ? "Fetching" : "Refresh"}
        </Button>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
            FFLogs
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {raidLastUpdated ? formatTimeAgo(raidLastUpdated) : "Never fetched"}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onRefreshFFLogs}
          disabled={fetchingFFLogs}
          className="shrink-0"
        >
          <RefreshCw
            className={cn("h-4 w-4", fetchingFFLogs && "animate-spin")}
          />
          {fetchingFFLogs ? "Fetching" : "Refresh"}
        </Button>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <IdCard className="h-3.5 w-3.5 text-muted-foreground" />
            Lodestone
          </p>
          <p className="truncate text-xs text-muted-foreground">
            Names and portraits
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onImportLodestone}
          disabled={fetchingLodestone}
          className="shrink-0"
        >
          <RefreshCw
            className={cn("h-4 w-4", fetchingLodestone && "animate-spin")}
          />
          {fetchingLodestone ? "Syncing" : "Sync"}
        </Button>
      </div>
    </div>
  );
}
