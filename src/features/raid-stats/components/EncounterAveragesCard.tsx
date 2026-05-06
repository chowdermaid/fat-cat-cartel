import { useEffect, useRef } from "react";
import { animate, stagger } from "animejs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { percentileBadgeClass, BUCKET_COLORS } from "../constants";
import type { MemberData, ZoneEncounter, ContentType } from "../types";

interface Props {
  members: Record<string, MemberData>;
  encounters: ZoneEncounter[];
  contentType: ContentType;
}

function primaryParses(member: MemberData, contentType: ContentType) {
  return contentType === "savage" ? (member.savage ?? {}) : (member.normal ?? {});
}

function barColor(avg: number): string {
  if (avg >= 100) return BUCKET_COLORS.gold;
  if (avg >= 99)  return BUCKET_COLORS.pink;
  if (avg >= 95)  return BUCKET_COLORS.orange;
  if (avg >= 75)  return BUCKET_COLORS.purple;
  if (avg >= 50)  return BUCKET_COLORS.blue;
  if (avg >= 25)  return BUCKET_COLORS.green;
  return BUCKET_COLORS.grey;
}

export function EncounterAveragesCard({ members, encounters, contentType }: Props) {
  const listRef = useRef<HTMLDivElement>(null);

  const rows = encounters.map((enc) => {
    const parses = Object.values(members)
      .map((m) => primaryParses(m, contentType)[enc.key]?.percentile)
      .filter((p): p is number => p != null && p > 0);
    const avg = parses.length > 0 ? parses.reduce((a, b) => a + b, 0) / parses.length : null;
    return { enc, avg, count: parses.length };
  });

  useEffect(() => {
    if (!listRef.current) return;
    const bars = Array.from(listRef.current.querySelectorAll<HTMLElement>(".ea-bar"));
    bars.forEach((el, i) => {
      animate(el, {
        width: ["0%", el.dataset.width ?? "0%"],
        duration: 550,
        delay: i * 60,
        easing: "easeOutQuart",
      });
    });
  }, []);

  const hasAny = rows.some((r) => r.avg != null);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-serif flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          Encounter Averages
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasAny ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No parse data yet.</p>
        ) : (
          <div ref={listRef} className="space-y-3">
            {rows.map(({ enc, avg, count }) => (
              <div key={enc.key} className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-baseline gap-1.5 min-w-0">
                    <span className="text-xs font-semibold shrink-0">{enc.label}</span>
                    <span className="text-xs text-muted-foreground truncate">{enc.name}</span>
                  </div>
                  {avg != null ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-muted-foreground/60 tabular-nums">
                        {count}p
                      </span>
                      <span
                        className={`text-xs font-semibold tabular-nums rounded px-1.5 py-0.5 ${percentileBadgeClass(avg)}`}
                      >
                        {Math.round(avg)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground/40">—</span>
                  )}
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  {avg != null && (
                    <div
                      className="ea-bar h-full rounded-full"
                      data-width={`${avg}%`}
                      style={{ width: 0, backgroundColor: barColor(avg) }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
