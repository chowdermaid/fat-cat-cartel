import { useCallback, useEffect, useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Medal } from "lucide-react";
import { formatJobName, percentileClass } from "../../constants";
import { JOB_ICONS } from "../../jobIcons";
import type { ContentType, MemberData, ParseData } from "../../types";

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

function getBestPerJob(
  members: Record<string, MemberData>,
  contentType: ContentType,
): JobEntry[] {
  const best: Record<string, JobEntry> = {};

  for (const member of Object.values(members)) {
    const parses =
      contentType === "savage" ? (member.savage ?? {}) : (member.normal ?? {});
    for (const [key, parse] of Object.entries(parses) as [
      string,
      ParseData | undefined,
    ][]) {
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

function maxWidthForStaticSlides(count: number): string {
  return `${count * 11 + Math.max(0, count - 1) * 0.75 + 2}rem`;
}

export function BestPerJobCarousel({
  members,
  contentType,
  showFriendBadges = false,
}: Props) {
  const entries = getBestPerJob(members, contentType);
  const shouldLoop = entries.length > 3;
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: shouldLoop,
    align: "start",
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    if (!shouldLoop) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => emblaApi?.scrollNext(), 3500);
  }, [emblaApi, shouldLoop]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (!emblaApi || entries.length === 0) return;
    startTimer();
    return stopTimer;
  }, [emblaApi, entries.length, startTimer, stopTimer]);

  if (entries.length === 0) return null;

  function renderEntry(entry: JobEntry) {
    return (
      <div className="flex w-full flex-col gap-2 rounded-lg border bg-muted/30 p-3">
        <div className="flex min-w-0 items-center gap-2">
          {JOB_ICONS[entry.job] ? (
            <img
              src={JOB_ICONS[entry.job]}
              alt={entry.job}
              className="w-8 h-8 shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded bg-muted shrink-0" />
          )}
          <span className="truncate font-semibold text-sm leading-tight">
            {formatJobName(entry.job)}
          </span>
        </div>

        <div className="flex items-baseline gap-1.5">
          <span
            className={`text-3xl font-bold tabular-nums leading-none ${percentileClass(entry.percentile)}`}
          >
            {Math.round(entry.percentile)}
          </span>
          <span className="text-xs text-muted-foreground uppercase">
            {entry.encounterKey}
          </span>
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
          <div className="min-w-0 flex-1">
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
    );
  }

  return (
    <Card
      className="w-full max-w-full min-w-0 overflow-hidden [contain:layout_paint]"
      style={!shouldLoop ? { maxWidth: maxWidthForStaticSlides(entries.length) } : undefined}
    >
      <CardHeader className="pb-3">
        <CardTitle className="font-serif flex items-center gap-2 text-base">
          <Medal className="h-4 w-4 text-muted-foreground" />
          Best Per Job
        </CardTitle>
      </CardHeader>
      <CardContent className="min-w-0 overflow-hidden">
        {!shouldLoop ? (
          <div
            className="grid max-w-full gap-3"
            style={{
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 11rem), 11rem))",
            }}
          >
            {entries.map((entry) => (
              <div key={entry.job} className="w-44 min-w-0">
                {renderEntry(entry)}
              </div>
            ))}
          </div>
        ) : (
          <div
            ref={emblaRef}
            className="w-full min-w-0 max-w-full overflow-hidden"
            onMouseEnter={stopTimer}
            onMouseLeave={startTimer}
          >
            <div className="flex gap-3">
              {entries.map((entry) => (
                <div key={entry.job} className="min-w-0 basis-44 shrink-0 grow-0">
                  {renderEntry(entry)}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
