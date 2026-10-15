import { Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCollectionView } from "../hooks/useCollectionView";
import { CollectionOverviewCards } from "./overview/CollectionOverviewCards";
import { FCStats } from "./overview/FCStats";

export function FCCollectionPage() {
  const { allCollectibles, scopedMembers, loading, scope } = useCollectionView();

  return (
    <div aria-busy={loading} className="grid items-stretch gap-4 [&_.animate-pulse]:bg-muted-foreground/15 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
      {loading ? (
        <>
          <div aria-hidden="true" className="grid gap-4">
            {[0, 1, 2, 3].map((key) => (
              <div key={key} className="flex min-h-48 items-center gap-5 rounded-lg border bg-card/50 p-6">
                <Skeleton className="hidden h-14 w-14 motion-reduce:animate-none sm:block" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-6 w-28 motion-reduce:animate-none" />
                  <Skeleton className="h-4 w-3/4 motion-reduce:animate-none" />
                  <Skeleton className="h-4 w-1/2 motion-reduce:animate-none" />
                  <Skeleton className="h-2 w-full motion-reduce:animate-none" />
                </div>
              </div>
            ))}
          </div>
          <div aria-hidden="true" className="space-y-5 rounded-lg border bg-card/50 p-4">
            <Skeleton className="h-7 w-3/4 motion-reduce:animate-none" />
            {Array.from({ length: 10 }, (_, key) => <Skeleton key={key} className="h-16 w-full motion-reduce:animate-none" />)}
          </div>
          <Skeleton aria-hidden="true" className="min-h-32 motion-reduce:animate-none xl:col-start-1" />
        </>
      ) : (
        <>
          <section aria-label="Browse collections" className="grid min-w-0 gap-4 xl:col-start-1 xl:row-start-1">
            <CollectionOverviewCards allCollectibles={allCollectibles} memberCount={scopedMembers.length} scope={scope} scopedMembers={scopedMembers} />
          </section>
          <FCStats allCollectibles={allCollectibles} members={scopedMembers} scope={scope} />
        </>
      )}
      <aside aria-labelledby="privacy-heading" className="flex min-w-0 items-start gap-3 rounded-lg border bg-card/50 p-4 xl:col-start-2 xl:row-start-2">
        <Info aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-sky-700 dark:text-sky-400" />
        <div>
          <h2 id="privacy-heading" className="text-sm font-semibold">Missing your collection?</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Your Lodestone profile must be public for your data to appear. In your{" "}
            <a href="https://na.finalfantasyxiv.com/lodestone/my/setting/account/" target="_blank" rel="noopener noreferrer" className="rounded-sm underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Lodestone account settings (opens in new tab)</a>, set Achievements, Mounts, and Minions to <span className="font-semibold text-foreground">“Everyone”</span>.
          </p>
        </div>
      </aside>
    </div>
  );
}
