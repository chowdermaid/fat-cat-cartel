import { useEffect, useRef } from "react";
import { animate, stagger } from "animejs";
import { percentileClass } from "../../constants";
import type { MemberData, ZoneEncounter, ContentType } from "../../types";

interface Props {
  members: Record<string, MemberData>;
  encounters: ZoneEncounter[];
  contentType: ContentType;
}

interface Stat {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}

function primaryParses(member: MemberData, contentType: ContentType) {
  return contentType === "savage" ? (member.savage ?? {}) : (member.normal ?? {});
}

function bestPrimary(member: MemberData, contentType: ContentType): number {
  const vals = Object.values(primaryParses(member, contentType)).map((p) => p?.percentile ?? 0);
  return vals.length ? Math.max(...vals) : 0;
}

export function GuildSummaryStrip({ members, encounters, contentType }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const parsed = Object.values(members).filter(
    (m) => Object.keys(primaryParses(m, contentType)).length > 0,
  );

  if (parsed.length === 0) return null;

  const bestParses = parsed.map((m) => bestPrimary(m, contentType));
  const avgBest = bestParses.reduce((a, b) => a + b, 0) / bestParses.length;
  const topParse = Math.max(...bestParses);
  const topMember = parsed.find((m) => bestPrimary(m, contentType) === topParse);
  const fullClears = parsed.filter((m) =>
    encounters.every((enc) => (primaryParses(m, contentType)[enc.key]?.percentile ?? 0) > 0),
  ).length;

  const stats: Stat[] = [
    {
      label: "Members",
      value: String(parsed.length),
      sub: "with parse data",
    },
    {
      label: "Avg Best Parse",
      value: Math.round(avgBest).toString(),
      valueClass: percentileClass(avgBest),
    },
    {
      label: "Top Parse",
      value: Math.round(topParse).toString(),
      sub: topMember?.name,
      valueClass: percentileClass(topParse),
    },
    {
      label: "Full Clears",
      value: `${fullClears}`,
      sub: `of ${parsed.length} members`,
    },
  ];

  useEffect(() => {
    if (!ref.current) return;
    animate(ref.current.querySelectorAll(".summary-stat"), {
      opacity: [0, 1],
      translateY: [8, 0],
      delay: stagger(50),
      duration: 300,
      easing: "easeOutQuad",
    });
  }, []);

  return (
    <div ref={ref} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="summary-stat rounded-lg border bg-card px-4 py-3 space-y-0.5"
        >
          <p className="text-xs text-muted-foreground">{stat.label}</p>
          <p className={`text-2xl font-bold tabular-nums font-serif ${stat.valueClass ?? ""}`}>
            {stat.value}
          </p>
          {stat.sub && (
            <p className="text-xs text-muted-foreground truncate">{stat.sub}</p>
          )}
        </div>
      ))}
    </div>
  );
}
