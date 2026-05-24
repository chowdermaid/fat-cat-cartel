import { useEffect, useCallback, useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Medal } from "lucide-react";
import { percentileClass, formatJobName } from "../constants";
import { JOB_ICONS } from "../jobIcons";
import type { MemberData, ContentType, ParseData } from "../types";

interface Props {
  members: Record<string, MemberData>;
  contentType: ContentType;
  showFriendBadges?: boolean;
}

interface JobEntry {
  job: string;
  memberName: string;
  avatarUrl: string | null;
  isFriend: boolean;
  percentile: number;
  rdps: number;
  encounterKey: string;
}

function getBestPerJob(members: Record<string, MemberData>, contentType: ContentType): JobEntry[] {
  const best: Record<string, JobEntry> = {};

  for (const member of Object.values(members)) {
    const parses = contentType === "savage" ? (member.savage ?? {}) : (member.normal ?? {});
    for (const [key, parse] of Object.entries(parses) as [string, ParseData | undefined][]) {
      if (!parse) continue;
      const existing = best[parse.job];
      if (!existing || parse.percentile > existing.percentile) {
        best[parse.job] = {
          job: parse.job,
          memberName: member.name,
          avatarUrl: member.avatarUrl ?? null,
          isFriend: member.isFriend,
          percentile: parse.percentile,
          rdps: parse.rdps,
          encounterKey: key,
        };
      }
    }
  }

  return Object.values(best).sort((a, b) => b.percentile - a.percentile);
}

export function BestPerJobCarousel({
  members,
  contentType,
  showFriendBadges = false,
}: Props) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const entries = getBestPerJob(members, contentType);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => emblaApi?.scrollNext(), 3500);
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
          <Medal className="h-4 w-4 text-muted-foreground" />
          Best Per Job
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
              <div
                key={entry.job}
                className="shrink-0 w-44 rounded-lg border bg-muted/30 p-3 flex flex-col gap-2"
              >
                <div className="flex items-center gap-2">
                  {JOB_ICONS[entry.job] ? (
                    <img src={JOB_ICONS[entry.job]} alt={entry.job} className="w-8 h-8 shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded bg-muted shrink-0" />
                  )}
                  <span className="font-semibold text-sm leading-tight">{formatJobName(entry.job)}</span>
                </div>

                <div className="flex items-baseline gap-1.5">
                  <span className={`text-3xl font-bold tabular-nums leading-none ${percentileClass(entry.percentile)}`}>
                    {Math.round(entry.percentile)}
                  </span>
                  <span className="text-xs text-muted-foreground uppercase">{entry.encounterKey}</span>
                </div>

                <div className="flex items-center gap-2 pt-2 mt-auto border-t">
                  {entry.avatarUrl ? (
                    <img
                      src={entry.avatarUrl}
                      alt={entry.memberName}
                      className="w-6 h-6 rounded-full shrink-0 object-cover"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-muted shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium truncate">{entry.memberName}</p>
                      {showFriendBadges && entry.isFriend && (
                        <Badge variant="secondary" className="px-1 py-0 text-[9px]">
                          Friend
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {Math.round(entry.rdps).toLocaleString()} rDPS
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
