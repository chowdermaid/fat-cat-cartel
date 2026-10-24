import { Outlet, useRouterState } from "@tanstack/react-router";
import { Library } from "lucide-react";
import { useFCCollection } from "../api/useFCCollection";
import { useCollectionScope } from "../hooks/useCollectionScope";
import { CollectionViewContext } from "../hooks/useCollectionView";
import { filterByCollectionScope } from "../utils/collectionScope";
import { collectionFreshness, formatSynced } from "../utils/collectionDisplay";
import { CollectionScopeToggle } from "./scope/CollectionScopeToggle";
import { CollectionNavigation } from "./CollectionNavigation";

export function FCCollectionLayout() {
  const collection = useFCCollection();
  const { scope, setScope } = useCollectionScope();
  const scopedMembers = filterByCollectionScope(
    collection.membersWithMounts,
    scope,
  );
  const synced = formatSynced(collection.lastFetched);
  const unavailableCount = scopedMembers.filter((member) => !member.lastFetched).length;
  const staleCount = scopedMembers.filter((member) => collectionFreshness(member).stale).length;
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const active = pathname.startsWith("/fc-collection/collections")
    ? "collections"
    : pathname === "/fc-collection/rankings"
      ? "rankings"
      : "overview";

  return (
    <CollectionViewContext
      value={{ ...collection, scope, setScope, scopedMembers }}
    >
      <div className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-3 font-serif text-3xl font-bold">
              <Library
                aria-hidden="true"
                className="h-7 w-7 shrink-0 text-amber-800 dark:text-primary"
              />
              FC Collection
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">i love data</p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <CollectionScopeToggle scope={scope} onChange={setScope} />
            <p role="status" className="text-xs text-muted-foreground">
              {collection.loading
                ? "Loading collection…"
                : synced
                  ? `Catalog synced ${synced}`
                  : "Sync time unavailable"}
            </p>
          </div>
        </div>
        <CollectionNavigation active={active} />
        {!collection.loading && (unavailableCount > 0 || staleCount > 0) && (
          <p role="status" className="text-xs text-muted-foreground">
            {unavailableCount} members have no collection data. {staleCount} members have stale data; their last saved values are shown.
          </p>
        )}
        {collection.error && <p role="alert" className="text-sm text-destructive">{collection.error}</p>}
        <Outlet />
      </div>
    </CollectionViewContext>
  );
}
