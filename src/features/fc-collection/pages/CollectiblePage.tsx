import { useEffect, useRef } from "react";
import { useParams } from "@tanstack/react-router";
import { animate, stagger } from "animejs";
import { useFCCollection } from "../api/useFCCollection";
import { CollectibleGrid } from "../components/CollectibleGrid";
import { CollectionScopeToggle } from "../components/CollectionScopeToggle";
import { COLLECTIBLE_CONFIG } from "../collectibleConfig";
import {
  filterByCollectionScope,
  useCollectionScope,
} from "../hooks/useCollectionScope";

function LoadingSkeleton() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    animate(ref.current.querySelectorAll(".sk"), {
      opacity: [0, 1],
      translateY: [8, 0],
      delay: stagger(35),
      duration: 260,
      easing: "easeOutQuad",
    });
  }, []);

  return (
    <div ref={ref} className="space-y-6">
      <div className="space-y-2">
        <div className="sk h-9 w-44 rounded-md bg-muted animate-pulse" />
        <div className="sk h-4 w-64 rounded bg-muted animate-pulse" />
      </div>
      <div className="space-y-3">
        <div className="sk h-9 w-56 rounded-md bg-muted animate-pulse" />
        <div className="sk flex gap-1.5 flex-wrap">
          {[56, 44, 40, 48, 44, 44, 40].map((w, i) => (
            <div key={i} className="h-7 rounded-full bg-muted animate-pulse" style={{ width: w }} />
          ))}
        </div>
      </div>
      <div className="rounded-lg border overflow-hidden">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="sk flex items-center gap-3 px-3 py-2.5 border-b last:border-0">
            <div className="h-6 w-6 rounded shrink-0 bg-muted animate-pulse" />
            <div
              className="h-3 rounded bg-muted animate-pulse"
              style={{ width: 80 + (i * 53) % 120 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function formatSynced(ts: number | null): string | null {
  if (!ts) return null;
  return new Date(ts).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

export function CollectiblePage() {
  const { type } = useParams({ strict: false });
  const { allCollectibles, membersWithMounts, loading, lastFetched } = useFCCollection();
  const { scope, setScope } = useCollectionScope();
  const scopedMembers = filterByCollectionScope(membersWithMounts, scope);

  const config = COLLECTIBLE_CONFIG.find((c) => c.key === type);

  if (loading) return <LoadingSkeleton />;

  if (!config) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold font-serif">Not found</h1>
        <p className="text-muted-foreground">Unknown collection type: {type}</p>
      </div>
    );
  }

  const items = allCollectibles[config.key];

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold font-serif">{config.label}</h1>
        <p className="text-muted-foreground">
          No data yet. Go to the admin panel and hit Refresh Data.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold font-serif">{config.label}</h1>
          <div className="flex items-baseline gap-3 mt-1">
            <p className="text-muted-foreground">
              {items.length} {config.label.toLowerCase()} - {scopedMembers.length} {scope === "all" ? "people" : "members"} tracked
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
      <CollectibleGrid items={items} members={scopedMembers} config={config} showFriendBadges={scope === "all"} />
    </div>
  );
}

