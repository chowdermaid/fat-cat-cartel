import { useCollectionView } from "../../hooks/useCollectionView";
import { LeaderboardTable } from "./LeaderboardTable";

export function LeaderboardPage() {
  const { allCollectibles, scopedMembers, loading, scope } = useCollectionView();

  if (loading) {
    return <p role="status" className="py-12 text-sm text-muted-foreground">Loading rankings…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-xl font-bold">Rankings</h2>
        <p className="mt-1 text-sm text-muted-foreground">Ranked by collection progress across {scope === "all" ? "the FC and Friends" : "the FC"}.</p>
      </div>
      <LeaderboardTable members={scopedMembers} allCollectibles={allCollectibles} showFriendBadges={scope === "all"} />
    </div>
  );
}
