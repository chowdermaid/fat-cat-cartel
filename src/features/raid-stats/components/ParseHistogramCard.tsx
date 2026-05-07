import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { BUCKET_COLORS } from "../constants";
import type { ParseBuckets, ZoneEncounter, ContentType } from "../types";

interface Props {
  histogram: Record<string, { savage: ParseBuckets; normal: ParseBuckets }>;
  encounters: ZoneEncounter[];
  contentType: ContentType;
}

const BUCKETS: (keyof ParseBuckets)[] = ["grey", "green", "blue", "purple", "orange", "pink", "gold"];

const BUCKET_LABELS: Record<keyof ParseBuckets, string> = {
  grey:   "< 25",
  green:  "25–49",
  blue:   "50–74",
  purple: "75–94",
  orange: "95–98",
  pink:   "99",
  gold:   "100",
};

function EncounterChart({ enc, buckets }: { enc: ZoneEncounter; buckets: ParseBuckets | null }) {
  const total = buckets ? BUCKETS.reduce((s, k) => s + buckets[k], 0) : 0;
  const max = buckets ? Math.max(...BUCKETS.map((k) => buckets[k]), 1) : 1;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2">
        <span className="text-xs font-semibold">{enc.label}</span>
        <span className="text-xs text-muted-foreground truncate flex-1 min-w-0">{enc.name}</span>
        {total > 0 && (
          <span className="text-[10px] text-muted-foreground/60 shrink-0 tabular-nums">{total}</span>
        )}
      </div>
      {buckets && total > 0 ? (
        <>
          <div className="flex items-end gap-1 h-16">
            {BUCKETS.map((k) => {
              const count = buckets[k];
              const heightPct = count > 0 ? Math.max((count / max) * 100, 5) : 0;
              return (
                <div key={k} className="group relative flex-1 flex flex-col items-center justify-end h-full">
                  <div
                    className="w-full rounded-t-sm transition-all"
                    style={{ height: `${heightPct}%`, backgroundColor: BUCKET_COLORS[k] }}
                  />
                  {count > 0 && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-popover border rounded px-1.5 py-0.5 text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-sm">
                      {count}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex gap-1">
            {BUCKETS.map((k) => (
              <div
                key={k}
                className="flex-1 text-center text-[9px] tabular-nums"
                style={{ color: buckets[k] > 0 ? BUCKET_COLORS[k] : undefined }}
              >
                {buckets[k] > 0 ? buckets[k] : <span className="text-muted-foreground/25">-</span>}
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-[11px] text-muted-foreground/50 italic h-16 flex items-center">No data</p>
      )}
    </div>
  );
}

function gridCols(n: number): string {
  if (n === 1) return "";
  if (n === 2) return "sm:grid-cols-2";
  if (n === 3) return "sm:grid-cols-3";
  if (n === 4) return "sm:grid-cols-2 lg:grid-cols-4";
  return "sm:grid-cols-2 lg:grid-cols-3";
}

export function ParseHistogramCard({ histogram, encounters, contentType }: Props) {
  if (encounters.length === 0 || contentType !== "savage") return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <CardTitle className="font-serif flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-muted-foreground" />
            Parse Distribution
          </CardTitle>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {BUCKETS.map((k) => (
              <span key={k} className="flex items-center gap-1 text-xs text-muted-foreground">
                <span
                  className="inline-block w-2 h-2 rounded-sm shrink-0"
                  style={{ backgroundColor: BUCKET_COLORS[k] }}
                />
                {BUCKET_LABELS[k]}
              </span>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className={`grid gap-6 ${gridCols(encounters.length)}`}>
          {encounters.map((enc) => {
            const data = histogram[enc.key];
            const hasSavage = data && BUCKETS.some((k) => data.savage[k] > 0);
            return (
              <EncounterChart
                key={enc.key}
                enc={enc}
                buckets={hasSavage ? data.savage : null}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
