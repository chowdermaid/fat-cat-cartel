import { useEffect, useRef } from "react";
import { animate, stagger } from "animejs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, ExternalLink } from "lucide-react";
import type { ZoneEncounter, FirstKillData } from "../../types";

interface Props {
  encounters: ZoneEncounter[];
  firstKills: Record<string, FirstKillData> | null;
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function KillTimeline({ encounters, firstKills }: Props) {
  const listRef = useRef<HTMLDivElement>(null);

  const items = encounters
    .filter((e) => firstKills?.[e.key])
    .map((e) => ({ encounter: e, kill: firstKills![e.key] }))
    .sort((a, b) => a.kill.date - b.kill.date);

  useEffect(() => {
    if (!listRef.current || items.length === 0) return;
    animate(listRef.current.querySelectorAll(".tl-row"), {
      opacity: [0, 1],
      translateX: [-8, 0],
      delay: stagger(45),
      duration: 250,
      easing: "easeOutQuad",
    });
  }, [items.length]);

  const pending = encounters.filter((e) => !firstKills?.[e.key]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-serif flex items-center gap-2 text-base">
          <Clock className="h-4 w-4 text-muted-foreground" />
          First Kills
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            First kill data will appear here after the next refresh.
          </p>
        ) : (
          <div ref={listRef} className="space-y-0">
            {items.map(({ encounter, kill }) => (
              <div
                key={encounter.key}
                className="tl-row flex items-center gap-3 py-2.5 border-b last:border-0"
              >
                <div className="w-2 h-2 rounded-full bg-blue-400/70 shrink-0" />
                <span className="text-xs font-mono font-semibold text-foreground w-14 shrink-0">
                  {encounter.label}
                </span>
                <span className="text-sm text-muted-foreground flex-1 truncate min-w-0">
                  {encounter.name}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                  {formatDate(kill.date)}
                </span>
                <a
                  href={`https://www.fflogs.com/reports/${kill.reportCode}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-muted-foreground/50 hover:text-foreground transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ))}
            {pending.length > 0 && (
              <div className="pt-2.5 flex flex-wrap gap-2">
                {pending.map((e) => (
                  <span key={e.key} className="text-xs font-mono text-muted-foreground/40">
                    {e.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
