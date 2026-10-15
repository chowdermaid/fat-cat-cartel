import { Link, useParams } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { COLLECTIBLE_CONFIG } from "../../constants";
import { useCollectionView } from "../../hooks/useCollectionView";
import { CollectibleGrid } from "./CollectibleGrid";

export function CollectiblePage() {
  const { type = "mounts" } = useParams({ strict: false });
  const { allCollectibles, scopedMembers, loading, scope } = useCollectionView();
  const config = COLLECTIBLE_CONFIG.find((entry) => entry.key === type);

  if (!config) {
    return <p className="text-muted-foreground">Unknown collection type: {type}</p>;
  }

  const items = allCollectibles[config.key];
  const Icon = config.icon;

  return (
    <div className="min-w-0 space-y-4" aria-busy={loading}>
      <div className="flex h-10 min-w-0 items-center justify-between gap-3">
        <ScrollArea className="h-10 min-w-0 flex-1" viewportClassName="h-10">
          <nav aria-label="Collection category" className="flex w-max items-center gap-2 pb-2">
            {COLLECTIBLE_CONFIG.map((category) => (
              <Button key={category.key} variant={category.key === config.key ? "default" : "outline"} size="sm" asChild>
                <Link to="/fc-collection/collections/$type" params={{ type: category.key }} aria-current={category.key === config.key ? "page" : undefined}>{category.label}</Link>
              </Button>
            ))}
          </nav>
        </ScrollArea>
        <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
          <Icon aria-hidden="true" className="h-4 w-4 text-amber-800 dark:text-primary" />
          <h2 className="font-serif text-sm font-bold">{config.label}</h2>
          <p className="text-xs tabular-nums text-muted-foreground" aria-label={loading ? "Loading catalog" : `${items.length.toLocaleString()} ${config.label.toLowerCase()}`}>
            {loading ? "..." : items.length.toLocaleString()}
          </p>
        </div>
      </div>
      {loading ? (
        <div aria-label="Loading collection" className="space-y-3">
          {Array.from({ length: 10 }, (_, index) => <Skeleton key={index} className="h-10 w-full bg-muted-foreground/15 motion-reduce:animate-none" />)}
        </div>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground">No data yet. Go to the admin panel and hit Refresh Data.</p>
      ) : (
        <CollectibleGrid items={items} members={scopedMembers} config={config} showFriendBadges={scope === "all"} />
      )}
    </div>
  );
}
