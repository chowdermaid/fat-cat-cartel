import { useEffect, useRef } from "react";
import { animate, stagger } from "animejs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";
import { percentileClass, formatJobName } from "../constants";
import { JOB_ICONS } from "../jobIcons";
import type { MemberData } from "../types";

interface Props {
  members: Record<string, MemberData>;
}

export function AllStarsCard({ members }: Props) {
  const listRef = useRef<HTMLDivElement>(null);

  const ranked = Object.entries(members)
    .filter(([, m]) => m.allStars != null)
    .sort((a, b) => a[1].allStars!.worldRank - b[1].allStars!.worldRank);

  useEffect(() => {
    if (!listRef.current) return;
    animate(listRef.current.querySelectorAll(".as-row"), {
      opacity: [0, 1],
      translateX: [-10, 0],
      delay: stagger(40),
      duration: 280,
      easing: "easeOutQuad",
    });
  }, []);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="font-serif flex items-center gap-2 text-base">
          <Star className="h-4 w-4 text-muted-foreground" />
          All-Stars Rankings
        </CardTitle>
        <p className="text-xs text-muted-foreground leading-relaxed pt-0.5">
          Aggregate rDPS score across all encounters in this tier, ranked globally on FFLogs per
          job. Each player's best-performing spec is shown.
        </p>
      </CardHeader>
      <CardContent className="pt-1">
        <div ref={listRef} className="divide-y">
          {ranked.map(([id, member], i) => {
            const as = member.allStars!;
            const topPct = Math.max(0, 100 - as.rankPercent).toFixed(1);
            return (
              <div key={id} className="as-row py-2.5 first:pt-1 last:pb-0">
                <div className="flex items-center gap-2.5">
                  <span className="w-4 text-xs text-muted-foreground tabular-nums text-right shrink-0">
                    {i + 1}
                  </span>
                  {member.avatarUrl ? (
                    <img
                      src={member.avatarUrl}
                      alt={member.name}
                      className="w-6 h-6 rounded-full shrink-0 object-cover"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-muted shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {JOB_ICONS[as.spec] && (
                        <img src={JOB_ICONS[as.spec]} alt={as.spec} className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span className="font-medium text-sm truncate">{member.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{formatJobName(as.spec)}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold tabular-nums">{as.points.toFixed(1)}</div>
                    <div className={`text-[10px] tabular-nums ${percentileClass(as.rankPercent)}`}>
                      Top {topPct}%
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 mt-1 pl-[42px]">
                  <span className="text-[10px] text-muted-foreground">
                    <span className="font-semibold text-foreground/70">
                      #{as.worldRank.toLocaleString()}
                    </span>{" "}
                    World
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    <span className="font-semibold text-foreground/70">
                      #{as.regionRank.toLocaleString()}
                    </span>{" "}
                    DC
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    <span className="font-semibold text-foreground/70">
                      #{as.serverRank.toLocaleString()}
                    </span>{" "}
                    Server
                  </span>
                </div>
              </div>
            );
          })}
          {ranked.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">No all-stars data yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
