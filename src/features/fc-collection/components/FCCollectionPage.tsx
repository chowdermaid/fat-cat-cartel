import { useEffect, useRef } from "react";
import { Info, Library } from "lucide-react";
import { animate, stagger } from "animejs";
import { useFCCollection } from "../api/useFCCollection";
import { useCollectionScope } from "../hooks/useCollectionScope";
import { filterByCollectionScope } from "../utils/collectionScope";
import { CollectionScopeToggle } from "./scope/CollectionScopeToggle";
import { CollectionOverviewCards } from "./overview/CollectionOverviewCards";
import { FCStats } from "./overview/FCStats";

export function FCCollectionPage() {
  const { allCollectibles, membersWithMounts } = useFCCollection();
  const { scope, setScope } = useCollectionScope();
  const scopedMembers = filterByCollectionScope(membersWithMounts, scope);
  const memberCount = scopedMembers.length;
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gridRef.current) return;
    animate(gridRef.current.querySelectorAll(".collectible-card"), {
      opacity: [0, 1],
      translateY: [16, 0],
      delay: stagger(80),
      duration: 350,
      easing: "easeOutQuad",
    });
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold font-serif">
            <Library className="h-7 w-7 text-muted-foreground" />
            FC Collection
          </h1>
          <p className="mt-1 text-muted-foreground">I love data</p>
        </div>
        <CollectionScopeToggle scope={scope} onChange={setScope} />
      </div>

      <FCStats allCollectibles={allCollectibles} members={scopedMembers} scope={scope} />

      {/* Privacy notice */}
      <div className="flex gap-3 rounded-lg border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          <span className="font-semibold">
            Your Lodestone profile must be set to public for your data to
            appear.
          </span>{" "}
          Go to{" "}
          <a
            href="https://na.finalfantasyxiv.com/lodestone/my/setting/account/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:opacity-80"
          >
            Lodestone account settings
          </a>{" "}
          and set <span className="font-medium">Achievements</span>,{" "}
          <span className="font-medium">Mounts</span>, and{" "}
          <span className="font-medium">Minions</span> to{" "}
          <span className="font-medium">"Everyone".</span>
        </p>
      </div>

      <div ref={gridRef} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <CollectionOverviewCards
          allCollectibles={allCollectibles}
          memberCount={memberCount}
          scope={scope}
          scopedMembers={scopedMembers}
        />
      </div>
    </div>
  );
}
