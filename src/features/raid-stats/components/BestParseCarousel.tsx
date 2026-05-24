import { useCallback, useEffect, useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import {
  formatJobName,
  percentileBadgeClass,
  percentileClass,
} from "../constants";
import { JOB_ICONS } from "../jobIcons";
import type {
  ContentType,
  MemberData,
  ParseData,
  ZoneEncounter,
} from "../types";

interface Props {
  members: Record<string, MemberData>;
  encounters: ZoneEncounter[];
  contentType: ContentType;
  showFriendBadges?: boolean;
}

interface BestEntry {
  id: string;
  name: string;
  avatarUrl: string | null;
  isFriend: boolean;
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
  const parses =
    contentType === "savage" ? (member.savage ?? {}) : (member.normal ?? {});
  let best: (ParseData & { key: string }) | null = null;

  for (const [key, parse] of Object.entries(parses)) {
    if (!parse) continue;
    if (best == null || parse.percentile > best.percentile) {
      best = { ...parse, key };
    }
  }

  if (!best) return null;
  const encounter = encounters.find((entry) => entry.key === best!.key);

  return {
    id,
    name: member.name,
    avatarUrl: member.avatarUrl ?? null,
    isFriend: member.isFriend,
    parse: best,
    encounterLabel: encounter?.label ?? best.key,
    encounterName: encounter?.name ?? best.key,
  };
}

function maxWidthForStaticSlides(count: number): string {
  return `${count * 11 + Math.max(0, count - 1) * 0.75 + 2}rem`;
}

function encounterDisplayName(entry: BestEntry): string {
  if (entry.encounterLabel === entry.encounterName) return entry.encounterName;
  return `${entry.encounterLabel} - ${entry.encounterName}`;
}

export function BestParseCarousel({
  members,
  encounters,
  contentType,
  showFriendBadges = false,
}: Props) {
  const entries = Object.entries(members)
    .map(([id, member]) => getBest(id, member, encounters, contentType))
    .filter((entry): entry is BestEntry => entry != null)
    .sort((a, b) => b.parse.percentile - a.parse.percentile);
  const shouldLoop = entries.length > 3;
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: shouldLoop,
    align: "start",
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    if (!shouldLoop) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => emblaApi?.scrollNext(), 3000);
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

  function renderEntry(entry: BestEntry) {
    return (
      <div className="w-full rounded-lg border bg-muted/30 p-3 space-y-2">
        <div className="flex items-center gap-2">
          {entry.avatarUrl ? (
            <img
              src={entry.avatarUrl}
              alt={entry.name}
              className="w-8 h-8 rounded-full shrink-0 object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-sm leading-tight truncate">
                {entry.name}
              </p>
              {showFriendBadges && entry.isFriend && (
                <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                  Friend
                </Badge>
              )}
            </div>
            {JOB_ICONS[entry.parse.job] && (
              <div className="flex min-w-0 items-center gap-1 mt-0.5">
                <img
                  src={JOB_ICONS[entry.parse.job]}
                  alt={entry.parse.job}
                  className="w-3.5 h-3.5 shrink-0"
                />
                <span className="truncate text-xs text-muted-foreground">
                  {formatJobName(entry.parse.job)}
                </span>
              </div>
            )}
          </div>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {encounterDisplayName(entry)}
        </p>
        <div className="flex items-end justify-between gap-1">
          <span
            className={`text-2xl font-bold tabular-nums ${percentileClass(entry.parse.percentile)}`}
          >
            {Math.round(entry.parse.percentile)}
          </span>
          <span
            className={`text-xs rounded px-1.5 py-0.5 font-medium ${percentileBadgeClass(entry.parse.percentile)}`}
          >
            {entry.encounterLabel}
          </span>
        </div>
        <p className="text-xs text-muted-foreground tabular-nums">
          {Math.round(entry.parse.rdps).toLocaleString()} rDPS
        </p>
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
          <Trophy className="h-4 w-4 text-muted-foreground" />
          Best Parses
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
              <div key={entry.id} className="w-44 min-w-0">
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
                <div key={entry.id} className="min-w-0 basis-44 shrink-0 grow-0">
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
