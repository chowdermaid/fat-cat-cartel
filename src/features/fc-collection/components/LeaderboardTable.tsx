import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { animate, stagger } from "animejs";
import { COLLECTIBLE_CONFIG } from "../collectibleConfig";
import type { CollectibleKey } from "../collectibleConfig";
import type { Collectible, MemberWithMounts } from "../types";

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

interface LeaderboardTableProps {
  members: MemberWithMounts[];
  allCollectibles: Record<CollectibleKey, Collectible[]>;
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

export function LeaderboardTable({ members, allCollectibles }: LeaderboardTableProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>(COLLECTIBLE_CONFIG[0].key);
  const listRef = useRef<HTMLDivElement>(null);

  const activeConfig = COLLECTIBLE_CONFIG.find((c) => c.key === activeTab) ?? COLLECTIBLE_CONFIG[0];
  const allItems = allCollectibles[activeConfig.key];
  const total = allItems.length;

  const ranked = useMemo(() => {
    const key = activeTab;
    return [...members]
      .sort((a, b) => b.owned[key].size - a.owned[key].size)
      .map((m, i) => {
        const count = m.owned[key].size;
        const delta = count - (m.previousOwned[key] ?? 0);
        const rarestOwned =
          allItems
            .filter((item) => m.owned[key].has(item.id))
            .sort((a, b) => parseFloat(a.owned) - parseFloat(b.owned))[0] ?? null;
        return { ...m, rank: i + 1, count, delta, rarestOwned };
      });
  }, [members, allCollectibles, activeTab, allItems]);

  useEffect(() => {
    if (!listRef.current) return;
    animate(listRef.current.querySelectorAll(".lb-row"), {
      opacity: [0, 1],
      translateY: [8, 0],
      delay: stagger(30),
      duration: 250,
      easing: "easeOutQuad",
    });
  }, [activeTab]);

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 flex-wrap">
        {COLLECTIBLE_CONFIG.map((cfg) => (
          <button
            key={cfg.key}
            onClick={() => setActiveTab(cfg.key)}
            className={cn(
              "px-3 py-1 rounded-full text-sm font-medium border transition-colors",
              activeTab === cfg.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:text-foreground",
            )}
          >
            {cfg.label}
          </button>
        ))}
      </div>

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
                  <div className="flex items-center gap-3 w-40 shrink-0">
                    <MemberAvatar member={m} />
                    <span className="font-semibold text-sm truncate">{m.name}</span>
                  </div>
                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold tabular-nums">
                        {m.count}
                        <span className="text-muted-foreground font-normal">/{total}</span>
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
                      <span className="text-xs text-muted-foreground/40">—</span>
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
