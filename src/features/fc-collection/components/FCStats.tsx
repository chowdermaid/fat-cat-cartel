import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Gem,
  Trophy,
  ArrowRight,
  Ticket,
  Swords,
  Leaf,
  BookOpen,
  Shield,
  Flame,
  Hammer,
  Compass,
  Package,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { COLLECTIBLE_CONFIG, COLLECTIBLE_KEYS } from "../collectibleConfig";
import type { CollectibleKey } from "../collectibleConfig";
import type { Collectible, MemberWithMounts } from "../types";

const NICHES: Array<{
  label: string;
  desc: string;
  cats: string[];
  icon: LucideIcon;
}> = [
  {
    label: "Arcade Goer",
    desc: "Gold Saucer",
    cats: ["Gold Saucer"],
    icon: Ticket,
  },
  {
    label: "PVP Enthusiast",
    desc: "Frontline · Wolves' Den",
    cats: ["Frontline", "The Wolves' Den"],
    icon: Swords,
  },
  {
    label: "Grass Toucher",
    desc: "Miner · Botanist · Fisher",
    cats: ["Miner", "Botanist", "Fisher"],
    icon: Leaf,
  },
  {
    label: "Quest Enjoyer",
    desc: "Main Scenario · Allied Society · General",
    cats: ["Main Scenario", "Allied Society Quests", "General"],
    icon: BookOpen,
  },
  {
    label: "Sweat",
    desc: "Trials · Raids · Dungeons · Duty",
    cats: ["Trials", "Raids", "Dungeons", "Duty"],
    icon: Shield,
  },
  {
    label: "The Deep Diver",
    desc: "Deep Dungeons · Phantom Weapons",
    cats: ["Deep Dungeon Weapons", "Phantom Weapons"],
    icon: Flame,
  },
  {
    label: "The Artisan",
    desc: "All Crafters",
    cats: [
      "Carpenter",
      "Blacksmith",
      "Armorer",
      "Goldsmith",
      "Leatherworker",
      "Weaver",
      "Alchemist",
      "Culinarian",
      "Cosmic Tools",
      "All Disciplines",
    ],
    icon: Hammer,
  },
  {
    label: "The Explorer",
    desc: "Field Operations · Treasure Hunt",
    cats: ["Field Operations", "Treasure Hunt"],
    icon: Compass,
  },
];

interface FCStatsProps {
  allCollectibles: Record<CollectibleKey, Collectible[]>;
  members: MemberWithMounts[];
}

function MemberAvatar({ member }: { member: MemberWithMounts }) {
  return member.avatar ? (
    <img
      src={member.avatar}
      alt={member.name}
      className="h-8 w-8 rounded-full border object-cover shrink-0"
    />
  ) : (
    <div className="h-8 w-8 rounded-full border bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0">
      {member.name[0]}
    </div>
  );
}

function MiniBar({ pct }: { pct: number }) {
  return (
    <div className="w-full bg-muted rounded-full h-1">
      <div
        className="bg-primary h-1 rounded-full"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function FCStats({ allCollectibles, members }: FCStatsProps) {
  const nicheLeaders = useMemo(() => {
    const achieves = allCollectibles.achievements;
    return NICHES.map(({ label, desc, cats, icon }) => {
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

  const fcCompletion = useMemo(() => {
    return COLLECTIBLE_CONFIG.map((cfg) => {
      const items = allCollectibles[cfg.key];
      const itemIds = new Set(items.map((i) => i.id));
      const ownedByAnyone = new Set(
        members.flatMap((m) =>
          [...m.owned[cfg.key]].filter((id) => itemIds.has(id)),
        ),
      );
      const pct =
        items.length > 0 ? (ownedByAnyone.size / items.length) * 100 : 0;
      return { cfg, owned: ownedByAnyone.size, total: items.length, pct };
    });
  }, [allCollectibles, members]);

  if (members.length === 0) return null;

  const { hoarder, maxHoard, rarestCollector, lowestAvg } = specialLeaders;

  return (
    <div className="space-y-4">
      {/* Personality archetype cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {nicheLeaders.map(({ label, desc, icon: Icon, member, score, pct }) => (
          <Link key={label} to="/fc-collection/$type" params={{ type: "achievements" }}>
            <Card className="hover:bg-muted/30 transition-colors h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide">
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </CardTitle>
                <p className="text-xs text-muted-foreground/60">{desc}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {member ? (
                  <>
                    <div className="flex items-center gap-2">
                      <MemberAvatar member={member} />
                      <span className="font-semibold text-sm truncate">
                        {member.name}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground tabular-nums">
                          {score.toLocaleString()} pts
                        </span>
                        <span>{pct.toFixed(1)}%</span>
                      </div>
                      <MiniBar pct={pct} />
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">No data yet</p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}

        {/* The Hoarder */}
        <Link to="/fc-collection/leaderboard">
          <Card className="hover:bg-muted/30 transition-colors h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide">
                <Package className="h-3.5 w-3.5" />
                The Hoarder
              </CardTitle>
              <p className="text-xs text-muted-foreground/60">
                Mounts · Minions · Titles
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {hoarder ? (
                <>
                  <div className="flex items-center gap-2">
                    <MemberAvatar member={hoarder} />
                    <span className="font-semibold text-sm truncate">
                      {hoarder.name}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground tabular-nums">
                      {maxHoard}
                    </span>{" "}
                    items total
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">No data yet</p>
              )}
            </CardContent>
          </Card>
        </Link>

        {/* Rarest Collection */}
        <Link to="/fc-collection/$type" params={{ type: "mounts" }}>
          <Card className="hover:bg-muted/30 transition-colors h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide">
                <Gem className="h-3.5 w-3.5" />
                Rarest Collection
              </CardTitle>
              <p className="text-xs text-muted-foreground/60">
                Avg rarity of owned mounts
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {rarestCollector ? (
                <>
                  <div className="flex items-center gap-2">
                    <MemberAvatar member={rarestCollector} />
                    <span className="font-semibold text-sm truncate">
                      {rarestCollector.name}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground tabular-nums">
                      {lowestAvg.toFixed(1)}%
                    </span>{" "}
                    avg mount rarity
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">No data yet</p>
              )}
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Secondary stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Rarest owned */}
        {rarestOwned && (
          <Link to="/fc-collection/$type" params={{ type: rarestOwned.key }}>
            <Card className="hover:bg-muted/30 transition-colors h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide">
                  <Gem className="h-3.5 w-3.5" />
                  FC's Rarest Item
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <img
                    src={rarestOwned.item.icon}
                    alt=""
                    className="h-8 w-8 rounded border shrink-0"
                  />
                  <span className="font-semibold text-sm leading-tight line-clamp-2">
                    {rarestOwned.item.name}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Owned by{" "}
                  <span className="font-medium text-foreground">
                    {rarestOwned.item.owned}
                  </span>{" "}
                  of players
                </p>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* FC Completion */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              FC Coverage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {fcCompletion.map(({ cfg, owned, total, pct }) => {
              const Icon = cfg.icon;
              return (
                <div key={cfg.key} className="space-y-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Icon className="h-3 w-3" />
                      {cfg.label}
                    </span>
                    <span className="tabular-nums font-medium">
                      {owned}/{total}
                      <span className="text-muted-foreground ml-1">
                        ({pct.toFixed(0)}%)
                      </span>
                    </span>
                  </div>
                  <MiniBar pct={pct} />
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground pt-0.5">
              Items owned by at least one FC member
            </p>
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide">
              <Trophy className="h-3.5 w-3.5" />
              Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Place for axo to flex her collection (aka carbon date how old she
              is)
            </p>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link to="/fc-collection/leaderboard">
                View Rankings
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
