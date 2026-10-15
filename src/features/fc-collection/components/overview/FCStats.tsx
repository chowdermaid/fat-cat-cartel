import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Gem, PawPrint, ArrowRight, Package } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { COLLECTIBLE_KEYS, OVERVIEW_NICHES } from "../../constants";
import type {
  Collectible,
  CollectibleKey,
  CollectionScope,
  MemberWithMounts,
} from "../../types";

interface FCStatsProps {
  allCollectibles: Record<CollectibleKey, Collectible[]>;
  members: MemberWithMounts[];
  scope: CollectionScope;
}

function MemberAvatar({
  member,
  featured = false,
}: {
  member: MemberWithMounts;
  featured?: boolean;
}) {
  return (
    <Avatar
      className={`${featured ? "h-10 w-10 border-primary" : "h-8 w-8 border-primary/40"} shrink-0 border`}
    >
      <AvatarImage src={member.avatar || undefined} alt="" />
      <AvatarFallback className="text-xs">
        {member.name
          .split(" ")
          .map((part) => part[0])
          .slice(0, 2)
          .join("")}
      </AvatarFallback>
    </Avatar>
  );
}

const goldText = "text-amber-800 dark:text-primary";
const rowLink =
  "group rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:bg-muted/50";

export function FCStats({ allCollectibles, members, scope }: FCStatsProps) {
  const groupLabel = scope === "all" ? "Group" : "FC";
  const [specialtyOrder] = useState(() => {
    const labels = OVERVIEW_NICHES.map(({ label }) => label);
    for (let index = labels.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [labels[index], labels[swapIndex]] = [labels[swapIndex], labels[index]];
    }
    return labels;
  });
  const nicheLeaders = useMemo(() => {
    const achieves = allCollectibles.achievements;
    return OVERVIEW_NICHES.map(({ label, desc, cats, icon }) => {
      const pool = achieves.filter((i) =>
        i.sources?.some((s) => cats.includes(s.type)),
      );
      const pointsMap = new Map(pool.map((i) => [i.id, i.points ?? 0]));
      const total = pool.reduce((s, i) => s + (i.points ?? 0), 0);
      let top: MemberWithMounts | null = null;
      let topScore = -1;
      for (const m of members) {
        const score = [...m.owned.achievements]
          .filter((id) => pointsMap.has(id))
          .reduce((s, id) => s + pointsMap.get(id)!, 0);
        if (score > topScore) {
          topScore = score;
          top = m;
        }
      }
      const pct = total > 0 ? (topScore / total) * 100 : 0;
      return { label, desc, icon, member: top, score: topScore, pct };
    });
  }, [allCollectibles.achievements, members]);

  const specialLeaders = useMemo(() => {
    let hoarder: MemberWithMounts | null = null;
    let maxHoard = -1;
    for (const m of members) {
      const n =
        m.owned.mounts.size + m.owned.minions.size + m.owned.titles.size;
      if (n > maxHoard) {
        maxHoard = n;
        hoarder = m;
      }
    }

    const mounts = allCollectibles.mounts;
    const rarityMap = new Map(mounts.map((i) => [i.id, parseFloat(i.owned)]));
    let rarestCollector: MemberWithMounts | null = null;
    let lowestAvg = Infinity;
    for (const m of members) {
      const vals = [...m.owned.mounts]
        .map((id) => rarityMap.get(id))
        .filter((v): v is number => v !== undefined && !isNaN(v));
      if (vals.length === 0) continue;
      const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
      if (avg < lowestAvg) {
        lowestAvg = avg;
        rarestCollector = m;
      }
    }

    return { hoarder, maxHoard, rarestCollector, lowestAvg };
  }, [allCollectibles.mounts, members]);

  const rarestOwned = useMemo(() => {
    let rarest: { item: Collectible; key: CollectibleKey } | null = null;
    let lowestPct = Infinity;

    for (const key of COLLECTIBLE_KEYS) {
      for (const item of allCollectibles[key]) {
        const pct = parseFloat(item.owned);
        if (isNaN(pct) || pct >= lowestPct) continue;
        if (members.some((m) => m.owned[key].has(item.id))) {
          lowestPct = pct;
          rarest = { item, key };
        }
      }
    }
    return rarest;
  }, [allCollectibles, members]);

  const { hoarder, maxHoard, rarestCollector, lowestAvg } = specialLeaders;
  const orderedLeaders = specialtyOrder.flatMap((label) =>
    nicheLeaders.filter((leader) => leader.label === label),
  );

  return (
    <>
      <section
        aria-labelledby="specialty-heading"
        className="min-w-0 rounded-lg border bg-card/50 p-4 xl:col-start-2 xl:row-start-1"
      >
        <div className="mb-3 flex items-start gap-2.5">
          <PawPrint
            aria-hidden="true"
            className={`mt-0.5 h-6 w-6 shrink-0 ${goldText}`}
          />
          <div>
            <h2 id="specialty-heading" className="font-serif text-xl font-bold">
              The Meowfia's finest
            </h2>
          </div>
        </div>
        {members.length === 0 && (
          <p className="mb-3 text-sm text-muted-foreground">
            No members in this scope. Leader statistics unavailable.
          </p>
        )}
        {allCollectibles.achievements.length === 0 && (
          <p className="mb-3 text-xs text-muted-foreground">
            Achievement catalog unavailable
          </p>
        )}
        <div className="divide-y divide-border">
          {orderedLeaders.map(
            ({ label, desc, icon: Icon, member, score, pct }, index) =>
              index < 3 ? (
                <Link
                  key={label}
                  to="/fc-collection/collections/$type"
                  params={{ type: "achievements" }}
                  className={`${rowLink} flex items-center gap-4 px-1 py-4`}
                >
                  {member ? (
                    <MemberAvatar member={member} featured />
                  ) : (
                    <Icon
                      aria-hidden="true"
                      className="h-10 w-10 shrink-0 p-2 text-muted-foreground"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                      <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                      {label}
                    </h3>
                    <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                      {desc}
                    </p>
                    {member ? (
                      <>
                        <p className="mt-1 break-words text-base font-semibold">
                          {member.name}
                        </p>
                        <p
                          className={`text-2xl font-bold leading-tight tabular-nums ${goldText}`}
                        >
                          {score.toLocaleString()}{" "}
                          <span className="text-lg">pts</span>
                        </p>
                        <div className="mt-1.5 flex max-w-40 items-center gap-2">
                          <Progress
                            aria-label={`${label} available points completed`}
                            value={pct}
                            className="h-0.5 flex-1 bg-muted"
                          />
                          <span className="text-[10px] tabular-nums text-muted-foreground">
                            {pct.toFixed(1)}%
                          </span>
                        </div>
                      </>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">
                        No leader data yet
                      </p>
                    )}
                  </div>
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-muted/40 ${goldText}`}
                  >
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </span>
                </Link>
              ) : (
                <Link
                  key={label}
                  to="/fc-collection/collections/$type"
                  params={{ type: "achievements" }}
                  className={`${rowLink} flex items-center gap-2.5 px-1 py-2.5`}
                >
                  <Icon
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 sm:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)_5rem]">
                      <h3 className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        {label}
                      </h3>
                      <div className="col-start-1 row-start-2 flex min-w-0 items-center gap-2 sm:col-start-2 sm:row-start-1">
                        {member && <MemberAvatar member={member} />}
                        <span className="min-w-0 break-words text-xs font-medium">
                          {member?.name ?? "No leader data yet"}
                        </span>
                      </div>
                      {member && (
                        <span
                          className={`col-start-2 row-start-1 whitespace-nowrap text-right text-xs tabular-nums ${goldText} sm:col-start-3`}
                        >
                          {score.toLocaleString()} pts
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-baseline justify-between gap-2 text-[10px] leading-snug text-muted-foreground">
                      <span>{desc}</span>
                      {member && (
                        <span className="shrink-0 tabular-nums">
                          {pct.toFixed(1)}%
                        </span>
                      )}
                    </div>
                    {member && (
                      <Progress
                        aria-label={`${label} available points completed`}
                        value={pct}
                        className="mt-1 h-0.5 bg-muted"
                      />
                    )}
                  </div>
                  <ArrowRight
                    aria-hidden="true"
                    className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                  />
                </Link>
              ),
          )}
          {[
            {
              label: "The Hoarder",
              desc: "Mounts · Minions · Titles",
              member: hoarder,
              value: `${maxHoard.toLocaleString()} items`,
              icon: Package,
              destination: "leaderboard",
            },
            {
              label: "Rarest Collection",
              desc: "Average public ownership of known owned mounts, per FFXIV Collect.",
              member: rarestCollector,
              value: `${lowestAvg.toFixed(1)}%`,
              icon: Gem,
              destination: "mounts",
            },
          ].map(({ label, desc, member, value, icon: Icon, destination }) => (
            <Link
              key={label}
              to={
                destination === "leaderboard"
                  ? "/fc-collection/rankings"
                  : "/fc-collection/collections/$type"
              }
              params={destination === "leaderboard" ? {} : { type: "mounts" }}
              className={`${rowLink} flex items-center gap-2.5 px-1 py-2.5`}
            >
              <Icon
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-muted-foreground"
              />
              <div className="min-w-0 flex-1">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 sm:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)_5rem]">
                  <h3 className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {label}
                  </h3>
                  <div className="col-start-1 row-start-2 flex min-w-0 items-center gap-2 sm:col-start-2 sm:row-start-1">
                    {member && <MemberAvatar member={member} />}
                    <span className="min-w-0 break-words text-xs font-medium">
                      {member?.name ?? "No leader data yet"}
                    </span>
                  </div>
                  {member && (
                    <span
                      className={`col-start-2 row-start-1 whitespace-nowrap text-right text-xs tabular-nums ${goldText} sm:col-start-3`}
                    >
                      {value}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
                  {desc}
                </p>
              </div>
              <ArrowRight
                aria-hidden="true"
                className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
              />
            </Link>
          ))}
        </div>
      </section>
      <section
        aria-label="Rarest item and rankings"
        className="grid min-w-0 gap-4 rounded-lg border bg-card/50 p-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] xl:col-start-1 xl:row-start-2"
      >
        <div className="min-w-0">
          <h2
            className={`mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${goldText}`}
          >
            <Gem aria-hidden="true" className="h-4 w-4" />
            {groupLabel}'s rarest owned item
          </h2>
          {rarestOwned ? (
            <Link
              to="/fc-collection/collections/$type"
              params={{ type: rarestOwned.key }}
              className={`${rowLink} flex items-center gap-3 p-1`}
            >
              <Avatar className="h-8 w-8 shrink-0 rounded border">
                <AvatarImage
                  src={rarestOwned.item.icon || undefined}
                  alt=""
                  className="object-contain"
                />
                <AvatarFallback className="rounded">
                  <Gem
                    aria-hidden="true"
                    className="h-4 w-4 text-muted-foreground"
                  />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="break-words font-serif text-lg font-bold leading-tight">
                  {rarestOwned.item.name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className={`font-semibold ${goldText}`}>
                    {parseFloat(rarestOwned.item.owned)}%
                  </span>{" "}
                  FFXIV Collect public ownership
                </p>
              </div>
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">
              No owned item with public ownership data available.
            </p>
          )}
        </div>
        <div className="flex min-w-0 flex-col justify-center gap-2 border-t pt-3 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4">
          <h2 className="text-sm font-semibold">Snoop and shame</h2>
          <p className="text-xs text-muted-foreground">
            Compare collections and view rankings across{" "}
            {scope === "all" ? "FC and Friends" : "the FC"}.
          </p>
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link to="/fc-collection/rankings">
              View Rankings
              <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
