import { useEffect, useCallback, useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import { percentileBadgeClass, percentileClass, formatJobName } from "../constants";
import { JOB_ICONS } from "../jobIcons";
import type { MemberData, ZoneEncounter, ContentType, ParseData } from "../types";

interface Props {
  members: Record<string, MemberData>;
  encounters: ZoneEncounter[];
  contentType: ContentType;
}

interface BestEntry {
  id: string;
  name: string;
  avatarUrl: string | null;
  parse: ParseData;
  encounterLabel: string;
  encounterName: string;
}

function getBest(
  id: string,
  member: MemberData,
  encounters: ZoneEncounter[],
  contentType: ContentType,
): BestEntry | null {
  const parses = contentType === "savage" ? (member.savage ?? {}) : (member.normal ?? {});
  let best: (ParseData & { key: string }) | null = null;
  for (const [key, parse] of Object.entries(parses)) {
    if (!parse) continue;
    if (best == null || parse.percentile > best.percentile) {
      best = { ...parse, key };
    }
  }
  if (!best) return null;
  const enc = encounters.find((e) => e.key === best!.key);
  return {
    id,
    name: member.name,
    avatarUrl: member.avatarUrl ?? null,
    parse: best,
    encounterLabel: enc?.label ?? best.key,
    encounterName: enc?.name ?? best.key,
  };
}

export function BestParseCarousel({ members, encounters, contentType }: Props) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const entries = Object.entries(members)
    .map(([id, m]) => getBest(id, m, encounters, contentType))
    .filter((e): e is BestEntry => e != null)
    .sort((a, b) => b.parse.percentile - a.parse.percentile);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => emblaApi?.scrollNext(), 3000);
  }, [emblaApi]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (!emblaApi || entries.length === 0) return;
    startTimer();
    return stopTimer;
  }, [emblaApi, entries.length, startTimer, stopTimer]);

  if (entries.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-serif flex items-center gap-2 text-base">
          <Trophy className="h-4 w-4 text-muted-foreground" />
          Best Parses
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          ref={emblaRef}
          className="overflow-hidden"
          onMouseEnter={stopTimer}
          onMouseLeave={startTimer}
        >
          <div className="flex gap-3">
            {entries.map((entry) => (
              <div key={entry.id} className="shrink-0 w-44 rounded-lg border bg-muted/30 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  {entry.avatarUrl ? (
                    <img src={entry.avatarUrl} alt={entry.name} className="w-8 h-8 rounded-full shrink-0 object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-sm leading-tight truncate">{entry.name}</p>
                    {JOB_ICONS[entry.parse.job] && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <img src={JOB_ICONS[entry.parse.job]} alt={entry.parse.job} className="w-3.5 h-3.5" />
                        <span className="text-xs text-muted-foreground">{formatJobName(entry.parse.job)}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">{entry.encounterLabel} · {entry.encounterName}</p>
                </div>
                <div className="flex items-end justify-between gap-1">
                  <span className={`text-2xl font-bold tabular-nums ${percentileClass(entry.parse.percentile)}`}>
                    {Math.round(entry.parse.percentile)}
                  </span>
                  <span className={`text-xs rounded px-1.5 py-0.5 font-medium ${percentileBadgeClass(entry.parse.percentile)}`}>
                    {entry.encounterLabel}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {Math.round(entry.parse.rdps).toLocaleString()} rDPS
                </p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
