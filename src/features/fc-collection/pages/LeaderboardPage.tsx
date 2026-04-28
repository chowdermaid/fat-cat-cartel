import { useFCCollection } from "../api/useFCCollection";
import { LeaderboardTable } from "../components/LeaderboardTable";

export function LeaderboardPage() {
  const { allMounts, membersWithMounts, loading } = useFCCollection();

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
        <p className="mt-1 text-muted-foreground">
          Ranked by collection progress across the FC.
        </p>
      </div>
      <LeaderboardTable members={membersWithMounts} allMounts={allMounts} />
    </div>
  );
}
