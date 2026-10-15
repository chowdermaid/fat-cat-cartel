import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { COLLECTIBLE_CONFIG } from "../../constants";
import type { AllCollectibles, CollectionScope, MemberWithMounts } from "../../types";

interface CollectionOverviewCardsProps {
  allCollectibles: AllCollectibles;
  memberCount: number;
  scope: CollectionScope;
  scopedMembers: MemberWithMounts[];
}

export function CollectionOverviewCards({
  allCollectibles,
  memberCount,
  scope,
  scopedMembers,
}: CollectionOverviewCardsProps) {
  return (
    <>
      {COLLECTIBLE_CONFIG.map((cfg) => {
        const items = allCollectibles[cfg.key];
        const avgOwned = memberCount > 0
          ? Math.round(scopedMembers.reduce((sum, member) => sum + member.owned[cfg.key].size, 0) / memberCount)
          : 0;
        const itemIds = new Set(items.map((item) => item.id));
        const ownedByAnyone = new Set(scopedMembers.flatMap((member) =>
          [...member.owned[cfg.key]].filter((id) => itemIds.has(id)),
        ));
        const pct = items.length > 0 ? (ownedByAnyone.size / items.length) * 100 : 0;
        const Icon = cfg.icon;
        return (
          <Link key={cfg.key} to="/fc-collection/collections/$type" params={{ type: cfg.key }} className="group flex min-w-0 items-center gap-3 rounded-lg border bg-card/50 p-4 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-5 sm:p-6">
            <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-md bg-muted text-amber-800 dark:text-primary sm:flex">
              <Icon aria-hidden="true" className="h-8 w-8" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="flex items-center gap-2 font-serif text-xl font-bold sm:text-2xl">
                <Icon aria-hidden="true" className="h-5 w-5 shrink-0 text-amber-800 dark:text-primary sm:hidden" />{cfg.label}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground"><span className="font-semibold tabular-nums text-foreground">{items.length.toLocaleString()}</span> total {cfg.label.toLowerCase()}</p>
              <p className="mt-1.5 text-xs text-muted-foreground">Owned by at least one {scope === "all" ? "scoped person" : "FC member"}</p>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 tabular-nums">
                <p className="text-lg font-bold"><span>{ownedByAnyone.size.toLocaleString()}</span><span className="font-normal text-muted-foreground"> / {items.length.toLocaleString()}</span></p>
                <span className="text-lg font-bold text-amber-800 dark:text-primary">{pct.toFixed(0)}%</span>
              </div>
              <Progress aria-label={`${cfg.label} ${scope === "all" ? "group" : "FC"} catalog coverage`} value={pct} className="mt-1.5 h-2 bg-muted" />
              <p className="mt-2 text-xs text-muted-foreground">
                {memberCount > 0 ? <>Avg owned: <span className="tabular-nums">{avgOwned.toLocaleString()} / {items.length.toLocaleString()}</span></> : "Average unavailable"}
              </p>
              {items.length === 0 && <p className="mt-1 text-xs text-muted-foreground">Catalog data unavailable.</p>}
            </div>
            <div className="flex shrink-0 flex-col items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border bg-muted/40 text-amber-800 dark:text-primary sm:h-10 sm:w-10"><ChevronRight aria-hidden="true" className="h-5 w-5" /></span>
              <span className="hidden items-center gap-1.5 text-xs font-semibold sm:flex">Browse<ArrowRight aria-hidden="true" className="h-4 w-4" /></span>
            </div>
          </Link>
        );
      })}
    </>
  );
}
