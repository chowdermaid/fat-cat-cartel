import { useEffect, useRef, useState } from "react";
import { animate, stagger } from "animejs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart2 } from "lucide-react";
import { percentileBadgeClass } from "../constants";
import { JOB_ICONS } from "../jobIcons";
import type { MemberData, ZoneEncounter, ContentType } from "../types";

interface Props {
  members: Record<string, MemberData>;
  encounters: ZoneEncounter[];
  contentType: ContentType;
}

type SortKey = string; // encounter key or "best"

function primaryParses(member: MemberData, contentType: ContentType) {
  return contentType === "savage" ? (member.savage ?? {}) : (member.normal ?? {});
}

function bestPrimary(member: MemberData, contentType: ContentType): number {
  const vals = Object.values(primaryParses(member, contentType)).map((p) => p?.percentile ?? 0);
  return vals.length ? Math.max(...vals) : 0;
}

export function ParseLeaderboard({ members, encounters, contentType }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("best");
  const tbodyRef = useRef<HTMLTableSectionElement>(null);

  const rows = Object.entries(members)
    .map(([id, m]) => ({ id, member: m }))
    .filter(({ member }) => Object.keys(primaryParses(member, contentType)).length > 0)
    .sort((a, b) => {
      const getVal = (m: MemberData) =>
        sortKey === "best"
          ? bestPrimary(m, contentType)
          : (primaryParses(m, contentType)[sortKey]?.percentile ?? -1);
      return getVal(b.member) - getVal(a.member);
    });

  useEffect(() => {
    if (!tbodyRef.current) return;
    const rowEls = Array.from(tbodyRef.current.querySelectorAll(".data-row")).slice(0, 80);
    animate(rowEls, {
      opacity: [0, 1],
      translateY: [5, 0],
      delay: stagger(6),
      duration: 160,
      easing: "easeOutQuad",
    });
  }, [sortKey]);

  const cols: { key: SortKey; label: string }[] = [
    { key: "best", label: "Best" },
    ...encounters.map((e) => ({ key: e.key, label: e.label })),
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-serif flex items-center gap-2 text-base">
          <BarChart2 className="h-4 w-4 text-muted-foreground" />
          Parse Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-2 text-left font-medium text-muted-foreground w-6">#</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Job</th>
                {cols.map((c) => (
                  <th key={c.key} className="px-3 py-2 text-center">
                    <button
                      onClick={() => setSortKey(c.key)}
                      className={`text-xs font-medium rounded px-1.5 py-0.5 transition-colors ${
                        sortKey === c.key
                          ? "bg-accent text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {c.label}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody ref={tbodyRef}>
              {rows.map(({ id, member }, i) => {
                const parses = primaryParses(member, contentType);
                const best = bestPrimary(member, contentType);
                const jobForSort = sortKey === "best"
                  ? Object.values(parses).find((p) => p?.percentile === best)?.job
                  : parses[sortKey]?.job;
                return (
                  <tr key={id} className="data-row border-b last:border-0 hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{i + 1}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {member.avatarUrl ? (
                          <img src={member.avatarUrl} alt={member.name} className="w-6 h-6 rounded-full shrink-0 object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-muted shrink-0" />
                        )}
                        <span className="font-medium">{member.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      {jobForSort ? (
                        <div className="flex items-center gap-1.5">
                          {JOB_ICONS[jobForSort] && (
                            <img src={JOB_ICONS[jobForSort]} alt={jobForSort} className="w-4 h-4 shrink-0" />
                          )}
                          <span className="text-xs text-muted-foreground">{jobForSort}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </td>
                    {cols.map((c) => {
                      const pct = c.key === "best" ? best : (parses[c.key]?.percentile ?? null);
                      return (
                        <td key={c.key} className="px-3 py-2.5 text-center">
                          {pct != null && pct > 0 ? (
                            <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums ${percentileBadgeClass(pct)}`}>
                              {Math.round(pct)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
