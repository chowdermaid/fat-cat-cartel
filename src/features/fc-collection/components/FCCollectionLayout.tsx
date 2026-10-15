import { Outlet, useRouterState } from "@tanstack/react-router";
import { Library } from "lucide-react";
import { useFCCollection } from "../api/useFCCollection";
import { useCollectionScope } from "../hooks/useCollectionScope";
import { CollectionViewContext } from "../hooks/useCollectionView";
import { filterByCollectionScope } from "../utils/collectionScope";
import { formatSynced } from "../utils/collectionDisplay";
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
        <Outlet />
      </div>
    </CollectionViewContext>
  );
}
