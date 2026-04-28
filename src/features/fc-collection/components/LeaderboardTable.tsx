import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Mount, MemberWithMounts } from "../types";

const COLLECTION_TYPES = [
  { id: "mounts", label: "Mounts" },
] as const;

type CollectionType = (typeof COLLECTION_TYPES)[number]["id"];

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
  allMounts: Mount[];
}

export function LeaderboardTable({ members, allMounts }: LeaderboardTableProps) {
  const [activeType, setActiveType] = useState<CollectionType>("mounts");

  const total = activeType === "mounts" ? allMounts.length : 0;

  const ranked = useMemo(() => {
    return [...members]
      .sort((a, b) => b.ownedMountIds.size - a.ownedMountIds.size)
      .map((m, i) => {
        const count = m.ownedMountIds.size;
        const delta = count - m.previousCount;
        const rarestOwned = allMounts
          .filter((mount) => m.ownedMountIds.has(mount.id))
          .sort((a, b) => parseFloat(a.owned) - parseFloat(b.owned))[0] ?? null;

        return { ...m, rank: i + 1, count, delta, rarestOwned };
      });
  }, [members, allMounts]);

  return (
    <div className="space-y-4">
      {/* Type tabs */}
      <div className="flex gap-2">
        {COLLECTION_TYPES.map((type) => (
          <button
            key={type.id}
            onClick={() => setActiveType(type.id)}
            className={cn(
              "px-3 py-1 rounded-full text-sm font-medium border transition-colors",
              activeType === type.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:text-foreground"
            )}
          >
            {type.label}
          </button>
        ))}
      </div>

      {members.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">
          No members found. Add members in the admin panel and refresh data.
        </p>
      ) : (
        <div className="rounded-lg border divide-y">
          {ranked.map((m) => {
            const pct = total > 0 ? (m.count / total) * 100 : 0;
            return (
              <div
                key={m.id}
                className={cn("px-4 py-3", rankStyles[m.rank])}
              >
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <span className="w-8 text-center text-lg shrink-0">
                    {rankLabels[m.rank] ?? m.rank}
                  </span>

                  {/* Avatar + name */}
                  <div className="flex items-center gap-3 w-40 shrink-0">
                    {m.avatar ? (
                      <img
                        src={m.avatar}
                        alt={m.name}
                        className="h-9 w-9 rounded-full border object-cover shrink-0"
                      />
                    ) : (
                      <div className="h-9 w-9 rounded-full border bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground shrink-0">
                        {m.name[0]}
                      </div>
                    )}
                    <span className="font-semibold text-sm truncate">
                      {m.name}
                    </span>
                  </div>

                  {/* Count + progress */}
                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold tabular-nums">
                        {m.count}
                        <span className="text-muted-foreground font-normal">
                          /{total}
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className="bg-primary h-1.5 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Delta */}
                  <div className="w-12 text-right shrink-0">
                    {m.delta > 0 ? (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400 border-0 text-xs">
                        +{m.delta}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground/40">—</span>
                    )}
                  </div>

                  {/* Rarest owned */}
                  {m.rarestOwned && (
                    <div className="hidden lg:flex flex-col items-end gap-0.5 w-48 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        Rarest owned
                      </span>
                      <div className="flex items-center gap-1.5">
                        <img
                          src={m.rarestOwned.icon}
                          alt=""
                          className="h-4 w-4 rounded"
                        />
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
