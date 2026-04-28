import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { RefreshCw, Mountain, Trophy, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useFCCollection } from "./api/useFCCollection";
import { fetchAndCacheFCData } from "./api/fetchAndCacheFCData";

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function FCCollectionPage() {
  const {
    members,
    allMounts,
    membersWithMounts,
    memberData,
    lastFetched,
    loading,
  } = useFCCollection();
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  async function handleRefresh() {
    if (members.length === 0) {
      setFetchError(
        "No members added yet. Add members in the admin panel first.",
      );
      return;
    }
    setFetching(true);
    setFetchError(null);
    try {
      await fetchAndCacheFCData(members, memberData);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "Fetch failed");
    } finally {
      setFetching(false);
    }
  }

  const totalOwned = membersWithMounts.reduce(
    (sum, m) => sum + m.ownedMountIds.size,
    0,
  );
  const avgOwned =
    membersWithMounts.length > 0
      ? Math.round(totalOwned / membersWithMounts.length)
      : 0;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold font-serif">FC Collection</h1>
          <p className="mt-1 text-muted-foreground">
            What we have as a fc! or a wall of shame.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button
            onClick={handleRefresh}
            disabled={fetching || loading}
            size="sm"
          >
            <RefreshCw className={cn("h-4 w-4", fetching && "animate-spin")} />
            {fetching ? "Fetching…" : "Refresh Data"}
          </Button>
          <p className="text-xs text-muted-foreground">
            {lastFetched
              ? `Updated ${formatTimeAgo(lastFetched)}`
              : "Never fetched"}
          </p>
          {fetchError && (
            <p className="text-xs text-destructive max-w-56 text-right">
              {fetchError}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif flex items-center gap-2">
              <Mountain className="h-5 w-5 text-muted-foreground shrink-0" />
              Mounts
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 text-sm text-muted-foreground space-y-0.5">
            <p>{allMounts.length} mounts tracked</p>
            {members.length > 0 && (
              <p>
                Avg owned: {avgOwned} / {allMounts.length}
              </p>
            )}
            <p>{members.length} members</p>
          </CardContent>
          <CardFooter className="pt-0">
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link to="/fc-collection/mounts">
                View Mounts
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif flex items-center gap-2">
              <Trophy className="h-5 w-5 text-muted-foreground shrink-0" />
              Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 text-sm text-muted-foreground space-y-0.5">
            <p>Ranked by collection progress</p>
            <p>{members.length} members competing</p>
          </CardContent>
          <CardFooter className="pt-0">
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link to="/fc-collection/leaderboard">
                View Leaderboard
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
