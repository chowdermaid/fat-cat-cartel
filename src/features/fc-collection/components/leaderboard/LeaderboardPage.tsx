import { useFCCollection } from "../../api/useFCCollection";
import { useCollectionScope } from "../../hooks/useCollectionScope";
import { formatSynced } from "../../utils/collectionDisplay";
import { filterByCollectionScope } from "../../utils/collectionScope";
import { CollectionScopeToggle } from "../scope/CollectionScopeToggle";
import { LeaderboardTable } from "./LeaderboardTable";

export function LeaderboardPage() {
  const { allCollectibles, membersWithMounts, loading, lastFetched } =
    useFCCollection();
  const { scope, setScope } = useCollectionScope();
  const scopedMembers = filterByCollectionScope(membersWithMounts, scope);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold font-serif">Leaderboard</h1>
          <div className="flex items-baseline gap-3 mt-1">
            <p className="text-muted-foreground">
              Ranked by collection progress across{" "}
              {scope === "all" ? "the FC and Friends" : "the FC"}.
            </p>
            {formatSynced(lastFetched) && (
              <span className="text-xs text-muted-foreground/60 shrink-0">
                Synced {formatSynced(lastFetched)}
              </span>
            )}
          </div>
        </div>
        <CollectionScopeToggle scope={scope} onChange={setScope} />
      </div>
      <LeaderboardTable
        members={scopedMembers}
        allCollectibles={allCollectibles}
        showFriendBadges={scope === "all"}
      />
    </div>
  );
}
