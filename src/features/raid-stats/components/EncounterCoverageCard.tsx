import { useEffect, useRef } from "react";
import { animate, stagger } from "animejs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutGrid } from "lucide-react";
import { percentileBadgeClass } from "../constants";
import type { MemberData, ZoneEncounter, ContentType } from "../types";

interface Props {
  members: Record<string, MemberData>;
  encounters: ZoneEncounter[];
  contentType: ContentType;
}

function primaryParses(member: MemberData, contentType: ContentType) {
  return contentType === "savage" ? (member.savage ?? {}) : (member.normal ?? {});
}

export function EncounterCoverageCard({ members, encounters, contentType }: Props) {
  const tbodyRef = useRef<HTMLTableSectionElement>(null);

  const rows = Object.entries(members)
    .map(([id, m]) => ({ id, member: m, parses: primaryParses(m, contentType) }))
    .filter(({ parses }) => Object.keys(parses).length > 0)
    .sort((a, b) => {
      const aCleared = encounters.filter((e) => (a.parses[e.key]?.percentile ?? 0) > 0).length;
      const bCleared = encounters.filter((e) => (b.parses[e.key]?.percentile ?? 0) > 0).length;
      if (bCleared !== aCleared) return bCleared - aCleared;
      const aBest = Math.max(...Object.values(a.parses).map((p) => p?.percentile ?? 0), 0);
      const bBest = Math.max(...Object.values(b.parses).map((p) => p?.percentile ?? 0), 0);
      return bBest - aBest;
    });

  if (rows.length === 0) return null;

  // Clearance % per encounter
  const clearancePct = encounters.map((enc) => {
    const cleared = rows.filter((r) => (r.parses[enc.key]?.percentile ?? 0) > 0).length;
    return rows.length > 0 ? Math.round((cleared / rows.length) * 100) : 0;
  });

  useEffect(() => {
    if (!tbodyRef.current) return;
    animate(tbodyRef.current.querySelectorAll(".cov-row"), {
      opacity: [0, 1],
      translateY: [4, 0],
      delay: stagger(18),
      duration: 200,
      easing: "easeOutQuad",
    });
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-serif flex items-center gap-2 text-base">
          <LayoutGrid className="h-4 w-4 text-muted-foreground" />
          Encounter Coverage
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Member</th>
                {encounters.map((enc) => (
                  <th key={enc.key} className="px-2 py-2 text-center font-medium text-muted-foreground text-xs min-w-14">
                    {enc.label}
                  </th>
                ))}
                <th className="px-3 py-2 text-center font-medium text-muted-foreground text-xs min-w-16">
                  Clears
                </th>
              </tr>
            </thead>
            <tbody ref={tbodyRef}>
              {rows.map(({ id, member, parses }) => {
                const clearedCount = encounters.filter(
                  (e) => (parses[e.key]?.percentile ?? 0) > 0,
                ).length;
                return (
                  <tr key={id} className="cov-row border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        {member.avatarUrl ? (
                          <img
                            src={member.avatarUrl}
                            alt={member.name}
                            className="w-6 h-6 rounded-full shrink-0 object-cover"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-muted shrink-0" />
                        )}
                        <span className="font-medium truncate max-w-32">{member.name}</span>
                      </div>
                    </td>
                    {encounters.map((enc) => {
                      const pct = parses[enc.key]?.percentile ?? null;
                      return (
                        <td key={enc.key} className="px-2 py-2 text-center">
                          {pct != null && pct > 0 ? (
                            <span
                              className={`inline-block rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums ${percentileBadgeClass(pct)}`}
                            >
                              {Math.round(pct)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/30 text-xs">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center">
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {clearedCount}/{encounters.length}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Guild clearance rate footer */}
            <tfoot>
              <tr className="border-t bg-muted/20">
                <td className="px-4 py-2 text-xs text-muted-foreground font-medium">
                  Guild %
                </td>
                {clearancePct.map((pct, i) => (
                  <td key={encounters[i].key} className="px-2 py-2">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                        {pct}%
                      </span>
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
