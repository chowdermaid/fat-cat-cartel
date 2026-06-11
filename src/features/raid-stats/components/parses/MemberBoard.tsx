import { useEffect, useRef, useState } from "react";
import { animate, stagger } from "animejs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart2, Crown } from "lucide-react";
import { percentileBadgeClass, formatJobName } from "../../constants";
import { JOB_ICONS } from "../../jobIcons";
import type { MemberData, ZoneEncounter, ContentType } from "../../types";

interface Props {
  members: Record<string, MemberData>;
  encounters: ZoneEncounter[];
  contentType: ContentType;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  showFriendBadges?: boolean;
}

type SortKey = "best" | string;

function primaryParses(member: MemberData, contentType: ContentType) {
  return contentType === "savage" ? (member.savage ?? {}) : (member.normal ?? {});
}

function bestPrimary(member: MemberData, contentType: ContentType): number {
  const vals = Object.values(primaryParses(member, contentType)).map((p) => p?.percentile ?? 0);
  return vals.length ? Math.max(...vals) : 0;
}

export function MemberBoard({
  members,
  encounters,
  contentType,
  selectedId,
  onSelect,
  showFriendBadges = false,
}: Props) {
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
    const rowEls = Array.from(tbodyRef.current.querySelectorAll(".mb-row")).slice(0, 80);
    animate(rowEls, {
      opacity: [0, 1],
      translateY: [5, 0],
      delay: stagger(6),
      duration: 160,
      easing: "easeOutQuad",
    });
  }, [sortKey]);

  const clearancePct = encounters.map((enc) => {
    const cleared = rows.filter(({ member }) => (primaryParses(member, contentType)[enc.key]?.percentile ?? 0) > 0).length;
    return rows.length > 0 ? Math.round((cleared / rows.length) * 100) : 0;
  });

  const sortCols: { key: SortKey; label: string }[] = [
    { key: "best", label: "Best" },
    ...encounters.map((e) => ({ key: e.key, label: e.label })),
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="font-serif flex items-center gap-2 text-base">
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
            Member Parses
          </CardTitle>
          <div className="flex gap-1 flex-wrap">
            {sortCols.map((c) => (
              <button
                key={c.key}
                onClick={() => setSortKey(c.key)}
                className={`text-xs font-medium rounded px-2 py-1 transition-colors ${
                  sortKey === c.key
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-2 text-left font-medium text-muted-foreground w-6">#</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Job</th>
                {encounters.map((enc) => (
                  <th key={enc.key} className="px-2 py-2 text-center font-medium text-muted-foreground text-xs min-w-14">
                    {enc.label}
                  </th>
                ))}
                <th className="px-3 py-2 text-center font-medium text-muted-foreground text-xs min-w-16">Clears</th>
              </tr>
            </thead>
            <tbody ref={tbodyRef}>
              {rows.map(({ id, member }, i) => {
                const parses = primaryParses(member, contentType);
                const best = bestPrimary(member, contentType);
                const jobForDisplay =
                  sortKey === "best"
                    ? Object.values(parses).find((p) => p?.percentile === best)?.job
                    : parses[sortKey]?.job;
                const clearedCount = encounters.filter((e) => (parses[e.key]?.percentile ?? 0) > 0).length;
                const isSelected = selectedId === id;
                return (
                  <tr
                    key={id}
                    className={`mb-row border-b last:border-0 transition-colors cursor-pointer ${
                      isSelected ? "bg-accent/40" : "hover:bg-muted/40"
                    }`}
                    onClick={() => onSelect(isSelected ? null : id)}
                  >
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{i + 1}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {member.avatarUrl ? (
                          <img src={member.avatarUrl} alt={member.name} className="w-6 h-6 rounded-full shrink-0 object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-muted shrink-0" />
                        )}
                        <span className="font-medium">{member.name}</span>
                        {i === 0 && (
                          <Crown
                            aria-label="#1 parse"
                            className="h-3.5 w-3.5 shrink-0 text-amber-400"
                          />
                        )}
                        {showFriendBadges && member.isFriend && (
                          <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                            Friend
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      {jobForDisplay ? (
                        <div className="flex items-center gap-1.5">
                          {JOB_ICONS[jobForDisplay] && (
                            <img src={JOB_ICONS[jobForDisplay]} alt={jobForDisplay} className="w-4 h-4 shrink-0" />
                          )}
                          <span className="text-xs text-muted-foreground">{formatJobName(jobForDisplay)}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">-</span>
                      )}
                    </td>
                    {encounters.map((enc) => {
                      const pct = parses[enc.key]?.percentile ?? null;
                      return (
                        <td key={enc.key} className="px-2 py-2.5 text-center">
                          {pct != null && pct > 0 ? (
                            <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums ${percentileBadgeClass(pct)}`}>
                              {Math.round(pct)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/30 text-xs">-</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2.5 text-center">
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {clearedCount}/{encounters.length}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t bg-muted/20">
                <td colSpan={3} className="px-4 py-2 text-xs text-muted-foreground font-medium">
                  FC %
                </td>
                {clearancePct.map((pct, i) => (
                  <td key={encounters[i].key} className="px-2 py-2">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs font-semibold tabular-nums text-muted-foreground">{pct}%</span>
                      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-accent-foreground/40 transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </td>
                ))}
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
