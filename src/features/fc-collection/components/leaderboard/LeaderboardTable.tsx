import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { animate, stagger } from "animejs";
import { ACHIEVEMENT_GROUPS, COLLECTIBLE_CONFIG } from "../../constants";
import type { Collectible, CollectibleKey, MemberWithMounts } from "../../types";

type ActiveTab = CollectibleKey;

const rankStyles: Record<number, string> = {
  1: "bg-yellow-50 dark:bg-yellow-950/30",
  2: "bg-gray-50 dark:bg-gray-900/30",
  3: "bg-orange-50 dark:bg-orange-950/30",
};

const rankLabels: Record<number, string> = {
  1: "🥇",
  2: "🥈",
  3: "🥉",
};

type AchievementGroup = keyof typeof ACHIEVEMENT_GROUPS;

interface LeaderboardTableProps {
  members: MemberWithMounts[];
  allCollectibles: Record<CollectibleKey, Collectible[]>;
  showFriendBadges?: boolean;
}

function MemberAvatar({ member }: { member: MemberWithMounts }) {
  return member.avatar ? (
    <img
      src={member.avatar}
      alt={member.name}
      className="h-9 w-9 rounded-full border object-cover shrink-0"
    />
  ) : (
    <div className="h-9 w-9 rounded-full border bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground shrink-0">
      {member.name[0]}
    </div>
  );
}

function AnimatedBar({ pct }: { pct: number }) {
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!barRef.current) return;
    animate(barRef.current, { width: `${pct}%`, duration: 600, easing: "easeOutQuart" });
  }, [pct]);
  return (
    <div className="w-full bg-muted rounded-full h-1.5">
      <div ref={barRef} className="bg-primary h-1.5 rounded-full" style={{ width: "0%" }} />
    </div>
  );
}

export function LeaderboardTable({
  members,
  allCollectibles,
  showFriendBadges = false,
}: LeaderboardTableProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>(COLLECTIBLE_CONFIG[0].key);
  const [achievementGroup, setAchievementGroup] = useState<AchievementGroup>("All");
  const listRef = useRef<HTMLDivElement>(null);

  const activeConfig = COLLECTIBLE_CONFIG.find((c) => c.key === activeTab) ?? COLLECTIBLE_CONFIG[0];
  const isPoints = activeConfig.rankBy === "points";
  const isAchievements = activeTab === "achievements";

  const allItems = useMemo(() => {
    const items = allCollectibles[activeConfig.key];
    if (!isAchievements || achievementGroup === "All") return items;
    const allowed = ACHIEVEMENT_GROUPS[achievementGroup];
    return items.filter((item) =>
      item.sources?.some((s) => (allowed as readonly string[]).includes(s.type)),
    );
  }, [allCollectibles, activeConfig.key, isAchievements, achievementGroup]);

  const total = useMemo(() => {
    if (isPoints) return allItems.reduce((s, i) => s + (i.points ?? 0), 0);
    return allItems.length;
  }, [allItems, isPoints]);

  const ranked = useMemo(() => {
    const key = activeTab;
    const pointsMap = isPoints
      ? new Map(allItems.map((i) => [i.id, i.points ?? 0]))
      : null;
    const itemIdSet = isPoints || isAchievements
      ? new Set(allItems.map((i) => i.id))
      : null;

    return [...members]
      .sort((a, b) => {
        if (pointsMap) {
          const ownedA = itemIdSet ? [...a.owned[key]].filter((id) => itemIdSet.has(id)) : [...a.owned[key]];
          const ownedB = itemIdSet ? [...b.owned[key]].filter((id) => itemIdSet.has(id)) : [...b.owned[key]];
          const ptsA = ownedA.reduce((s, id) => s + (pointsMap.get(id) ?? 0), 0);
          const ptsB = ownedB.reduce((s, id) => s + (pointsMap.get(id) ?? 0), 0);
          return ptsB - ptsA;
        }
        return b.owned[key].size - a.owned[key].size;
      })
      .map((m, i) => {
        const ownedFiltered = itemIdSet
          ? [...m.owned[key]].filter((id) => itemIdSet.has(id))
          : null;
        const count = pointsMap
          ? (ownedFiltered ?? [...m.owned[key]]).reduce((s, id) => s + (pointsMap.get(id) ?? 0), 0)
          : ownedFiltered
            ? ownedFiltered.length
            : m.owned[key].size;
        const delta = m.owned[key].size - (m.previousOwned[key] ?? 0);
        const rarestOwned =
          allItems
            .filter((item) => m.owned[key].has(item.id))
            .sort((a, b) => parseFloat(a.owned) - parseFloat(b.owned))[0] ?? null;
        return { ...m, rank: i + 1, count, delta, rarestOwned };
      });
  }, [members, activeTab, allItems, isPoints, isAchievements]);

  useEffect(() => {
    if (!listRef.current) return;
    animate(listRef.current.querySelectorAll(".lb-row"), {
      opacity: [0, 1],
      translateY: [8, 0],
      delay: stagger(30),
      duration: 250,
      easing: "easeOutQuad",
    });
  }, [activeTab, achievementGroup]);

  return (
    <div className="space-y-4">
      {/* Tab row */}
      <div className="flex gap-1.5 flex-wrap">
        {COLLECTIBLE_CONFIG.map((cfg) => (
          <button
            key={cfg.key}
            onClick={() => { setActiveTab(cfg.key); setAchievementGroup("All"); }}
            className={cn(
              "cursor-pointer px-3 py-1 rounded-full text-sm font-medium border transition-colors",
              activeTab === cfg.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:text-foreground",
            )}
          >
            {cfg.label}
          </button>
        ))}
      </div>

      {/* Achievement sub-category filter */}
      {isAchievements && (
        <div className="flex gap-1 flex-wrap">
          {(Object.keys(ACHIEVEMENT_GROUPS) as AchievementGroup[]).map((group) => (
            <button
              key={group}
              onClick={() => setAchievementGroup(group)}
              className={cn(
                "cursor-pointer px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors",
                achievementGroup === group
                  ? "bg-secondary text-secondary-foreground border-secondary"
                  : "bg-background text-muted-foreground border-border hover:text-foreground",
              )}
            >
              {group}
            </button>
          ))}
        </div>
      )}

      {members.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">
          No members found. Add members in the admin panel and refresh data.
        </p>
      ) : (
        <div ref={listRef} className="rounded-lg border divide-y">
          {ranked.map((m) => {
            const pct = total > 0 ? (m.count / total) * 100 : 0;
            return (
              <div key={m.id} className={cn("lb-row px-4 py-3", rankStyles[m.rank])}>
                <div className="flex items-center gap-4">
                  <span className="w-8 text-center text-lg shrink-0">
                    {rankLabels[m.rank] ?? m.rank}
                  </span>
                  <div className="flex items-center gap-3 w-32 sm:w-40 shrink-0">
                    <MemberAvatar member={m} />
                    <span className="font-semibold text-sm truncate">{m.name}</span>
                    {showFriendBadges && m.isFriend && (
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                        Friend
                      </Badge>
                    )}
                  </div>
                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold tabular-nums">
                        {isPoints ? (
                          <>
                            {m.count.toLocaleString()}
                            <span className="text-muted-foreground font-normal text-xs ml-0.5">pts</span>
                          </>
                        ) : (
                          <>
                            {m.count}
                            <span className="text-muted-foreground font-normal">/{total}</span>
                          </>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                    <AnimatedBar pct={pct} />
                  </div>
                  <div className="w-12 text-right shrink-0">
                    {m.delta > 0 ? (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400 border-0 text-xs">
                        +{m.delta}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground/40">-</span>
                    )}
                  </div>
                  {m.rarestOwned && (
                    <div className="hidden lg:flex flex-col items-end gap-0.5 w-48 shrink-0">
                      <span className="text-xs text-muted-foreground">Rarest owned</span>
                      <div className="flex items-center gap-1.5">
                        <img src={m.rarestOwned.icon} alt="" className="h-4 w-4 rounded" />
                        <span className="text-xs font-medium truncate max-w-32">
                          {m.rarestOwned.name}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {m.rarestOwned.owned}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
