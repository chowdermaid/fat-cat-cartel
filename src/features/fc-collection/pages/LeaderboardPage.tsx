import { useFCCollection } from "../api/useFCCollection";
import { LeaderboardTable } from "../components/LeaderboardTable";

function formatSynced(ts: number | null): string | null {
  if (!ts) return null;
  return new Date(ts).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

export function LeaderboardPage() {
  const { allCollectibles, membersWithMounts, loading, lastFetched } = useFCCollection();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-serif">Leaderboard</h1>
        <div className="flex items-baseline gap-3 mt-1">
          <p className="text-muted-foreground">
            Ranked by collection progress across the FC.
          </p>
          {formatSynced(lastFetched) && (
            <span className="text-xs text-muted-foreground/60 shrink-0">
              Synced {formatSynced(lastFetched)}
            </span>
          )}
        </div>
      </div>
      <LeaderboardTable members={membersWithMounts} allCollectibles={allCollectibles} />
    </div>
  );
}
